import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER_FOR_PAYMENT } from '@/lib/graphql/queries';
import { TRANSITION_ORDER_TO_STATE, ADD_PAYMENT_TO_ORDER } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
    try {
        // 1. Verify active order exists
        const orderRes = await fetchGraphQL(
            { query: GET_ACTIVE_ORDER_FOR_PAYMENT },
            { req }
        );

        if (orderRes.errors) {
            return createErrorResponse(
                'Failed to fetch order',
                orderRes.errors[0]?.message || 'Failed to fetch active order',
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.VALIDATION_ERROR,
                orderRes.errors
            );
        }

        const order = orderRes.data?.activeOrder;
        if (!order) {
            return createErrorResponse(
                'No active order',
                'Add items to cart before payment',
                HTTP_STATUS.CONFLICT,
                'NO_ACTIVE_ORDER'
            );
        }

        // 2. Transition order to ArrangingPayment state if needed
        if (order.state !== 'ArrangingPayment') {
            const transitionRes = await fetchGraphQL(
                { query: TRANSITION_ORDER_TO_STATE, variables: { state: 'ArrangingPayment' } },
                { req }
            );

            const transition = transitionRes.data?.transitionOrderToState;

            if (transition?.__typename === 'Order') {
                order.state = transition.state;
            } else if (transition?.__typename === 'OrderStateTransitionError') {
                if (!transition.transitionError?.includes('from "ArrangingPayment" to "ArrangingPayment"')) {
                    return createErrorResponse(
                        'Failed to transition order',
                        'Cannot transition order to payment state',
                        HTTP_STATUS.CONFLICT,
                        'ORDER_TRANSITION_FAILED',
                        transition
                    );
                }
                order.state = 'ArrangingPayment';
            }
        }

        // 3. Add MercadoPago payment to order
        const paymentRes = await fetchGraphQL(
            {
                query: ADD_PAYMENT_TO_ORDER,
                variables: {
                    input: {
                        method: 'mercadopago',
                        metadata: {}
                    }
                }
            },
            { req }
        );

        const paymentResult = paymentRes.data?.addPaymentToOrder;

        if (paymentResult?.errorCode || paymentResult?.__typename !== 'Order') {
            return createErrorResponse(
                'Failed to add payment',
                paymentResult?.message || 'Failed to create MercadoPago payment',
                HTTP_STATUS.BAD_REQUEST,
                paymentResult?.errorCode || ERROR_CODES.VALIDATION_ERROR,
                paymentResult
            );
        }

        // 4. Query order with payments to get MercadoPago redirect URL
        const ORDER_WITH_PAYMENTS = `
      query OrderWithPayments($code: String!) {
        orderByCode(code: $code) {
          id
          code
          payments {
            id
            method
            metadata
            state
          }
        }
      }
    `;

        const orderWithPayments = await fetchGraphQL(
            {
                query: ORDER_WITH_PAYMENTS,
                variables: { code: order.code }
            },
            { req }
        );

        const payments = orderWithPayments.data?.orderByCode?.payments || [];
        const mercadopagoPayment = payments.find((p: any) => p.method === 'mercadopago');

        if (!mercadopagoPayment?.metadata) {
            return createErrorResponse(
                'No payment metadata',
                'Failed to get MercadoPago payment details',
                HTTP_STATUS.INTERNAL_ERROR,
                ERROR_CODES.INTERNAL_ERROR
            );
        }

        // 5. Parse metadata to extract redirect URL
        let metadata;
        try {
            metadata = typeof mercadopagoPayment.metadata === 'string'
                ? JSON.parse(mercadopagoPayment.metadata)
                : mercadopagoPayment.metadata;
        } catch (error) {
            return createErrorResponse(
                'Invalid payment metadata',
                'Failed to parse MercadoPago payment metadata',
                HTTP_STATUS.INTERNAL_ERROR,
                ERROR_CODES.INTERNAL_ERROR
            );
        }

        const redirectUrl = metadata.init_point;

        if (!redirectUrl) {
            return createErrorResponse(
                'No redirect URL',
                'MercadoPago redirect URL not found in payment metadata',
                HTTP_STATUS.INTERNAL_ERROR,
                ERROR_CODES.INTERNAL_ERROR,
                { metadata }
            );
        }

        // 6. Return redirect URL and order code
        const res = NextResponse.json({
            redirectUrl,
            orderCode: order.code,
        });

        forwardCookies(res, orderRes);
        forwardCookies(res, paymentRes);
        forwardCookies(res, orderWithPayments);
        return res;
    } catch (error) {
        return createErrorResponse(
            'Internal server error',
            error instanceof Error ? error.message : 'Failed to process MercadoPago payment',
            HTTP_STATUS.INTERNAL_ERROR,
            ERROR_CODES.INTERNAL_ERROR
        );
    }
}
