import { NextRequest, NextResponse } from 'next/server';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER_FOR_PAYMENT } from '@/lib/graphql/queries';
import { TRANSITION_ORDER_TO_STATE, CREATE_MERCADOPAGO_PAYMENT } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
    try {
        // 1. Verificar que existe una orden activa
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

        // 2. Asegurar que la orden esté en estado ArrangingPayment
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

        // 3. For Checkout API with direct card payment, we don't need to create preferences
        // We just need to return order info so the frontend can show the payment form
        const res = NextResponse.json({
            orderCode: order.code,
            totalAmount: order.totalWithTax,
            currencyCode: order.currencyCode || 'ARS',
        });

        forwardCookies(res, orderRes);
        return res;
    } catch (error) {
        console.error('Error creating MercadoPago payment:', error);
        return createErrorResponse(
            'Internal server error',
            error instanceof Error ? error.message : 'Failed to create MercadoPago payment',
            HTTP_STATUS.INTERNAL_ERROR,
            ERROR_CODES.INTERNAL_ERROR
        );
    }
}