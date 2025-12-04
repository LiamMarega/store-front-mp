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

        // 3. Crear preferencia de MercadoPago
        const paymentRes = await fetchGraphQL(
            { query: CREATE_MERCADOPAGO_PAYMENT },
            { req }
        );

        if (paymentRes.errors) {
            // Filtrar el error de 'me' que es solo de autenticación
            const relevantErrors = paymentRes.errors.filter(error =>
                error.path?.[0] !== 'me' ||
                !error.message.includes('You are not currently authorized')
            );

            if (relevantErrors.length > 0) {
                return createErrorResponse(
                    'Failed to create MercadoPago payment',
                    relevantErrors[0]?.message || 'Failed to create MercadoPago payment',
                    HTTP_STATUS.BAD_REQUEST,
                    ERROR_CODES.VALIDATION_ERROR,
                    relevantErrors
                );
            }
        }

        const paymentData = paymentRes.data?.createMercadopagoPayment;

        if (!paymentData) {
            return createErrorResponse(
                'No payment data',
                'Failed to get payment data from MercadoPago',
                HTTP_STATUS.INTERNAL_ERROR,
                ERROR_CODES.INTERNAL_ERROR
            );
        }

        // Asegúrate de que paymentData tenga la estructura correcta
        const redirectUrl = paymentData.redirectUrl || paymentData.init_point || paymentData.sandbox_init_point;
        const orderCode = paymentData.orderCode || order.code;

        if (!redirectUrl) {
            console.error('MercadoPago response:', paymentData);
            return createErrorResponse(
                'No redirect URL',
                'Failed to get redirect URL from MercadoPago. Response: ' + JSON.stringify(paymentData),
                HTTP_STATUS.INTERNAL_ERROR,
                ERROR_CODES.INTERNAL_ERROR
            );
        }

        const res = NextResponse.json({
            redirectUrl,
            orderCode,
            paymentId: paymentData.id || paymentData.preferenceId
        });

        forwardCookies(res, orderRes);
        forwardCookies(res, paymentRes);
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