import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Preference } from 'mercadopago';
import { fetchGraphQL } from '@/lib/vendure-server';
import { GET_ACTIVE_ORDER_FOR_PAYMENT } from '@/lib/graphql/queries';
import { TRANSITION_ORDER_TO_STATE } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
    try {
        const env = process.env.MERCADOPAGO_ENV || 'dev';
        const accessToken = env === 'prod'
            ? process.env.MERCADOPAGO_ACCESS_TOKEN_PROD
            : process.env.MERCADOPAGO_ACCESS_TOKEN_DEV;

        // Validate access token
        if (!accessToken) {
            return createErrorResponse(
                'MercadoPago not configured',
                `MERCADOPAGO_ACCESS_TOKEN_${env.toUpperCase()} is not set`,
                HTTP_STATUS.INTERNAL_ERROR,
                'MERCADOPAGO_CONFIG_ERROR'
            );
        }

        const mercadopago = new MercadoPagoConfig({
            accessToken,
        });

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

        // 3. Create MercadoPago Preference for Checkout Bricks
        const preferenceClient = new Preference(mercadopago);

        // Convert amount from cents to currency units
        const totalAmount = order.totalWithTax / 100;

        // Get customer email from order if available
        const customerEmail = order.customer?.emailAddress || '';

        // Build preference items from order lines or use a single item for total
        const items = order.lines && order.lines.length > 0
            ? order.lines.map((line: any) => ({
                id: line.productVariant?.sku || line.id,
                title: line.productVariant?.name || 'Product',
                quantity: line.quantity,
                unit_price: line.linePriceWithTax / 100 / line.quantity,
                currency_id: 'ARS',
            }))
            : [{
                id: order.code,
                title: `Order ${order.code}`,
                quantity: 1,
                unit_price: totalAmount,
                currency_id: 'ARS',
            }];

        let baseUrl = (process.env.NEXT_PUBLIC_BASE_URL || process.env.SHOP_URL || 'http://localhost:3000').trim().replace(/\/$/, '');
        if (!/^https?:\/\//.test(baseUrl)) {
            baseUrl = baseUrl.includes('localhost') ? `http://${baseUrl}` : `https://${baseUrl}`;
        }
        if (!baseUrl) {
            return createErrorResponse(
                'MercadoPago not configured',
                'Base URL is not defined for back_urls',
                HTTP_STATUS.INTERNAL_ERROR,
                'MERCADOPAGO_CONFIG_ERROR'
            );
        }

        const preferencePayload = {
            items,
            payer: customerEmail ? { email: customerEmail } : undefined,
            external_reference: order.code,
            back_urls: {
                success: `${baseUrl}/checkout/confirmation/${order.code}`,
                failure: `${baseUrl}/checkout?error=payment_failed`,
                pending: `${baseUrl}/checkout/confirmation/${order.code}?status=pending`,
            },
            notification_url: `${baseUrl}/api/webhooks/mercadopago`,
        };

        // Only enable auto_return if using HTTPS (required by MercadoPago)
        if (baseUrl.startsWith('https://')) {
            (preferencePayload as any).auto_return = 'approved';
        }

        console.log('Creating Preference with payload:', JSON.stringify(preferencePayload, null, 2));

        const preference = await preferenceClient.create({
            body: preferencePayload,
        });

        console.log('Created MercadoPago preference:', {
            id: preference.id,
            orderCode: order.code,
            totalAmount,
            env,
            baseUrl,
        });

        const res = NextResponse.json({
            preferenceId: preference.id,
            orderCode: order.code,
            totalAmount: order.totalWithTax,
            currencyCode: 'ARS', // MercadoPago Argentina siempre usa ARS
        });

        forwardCookies(res, orderRes);
        return res;
    } catch (error) {
        console.error('Error creating MercadoPago preference:', error);
        return createErrorResponse(
            'Internal server error',
            error instanceof Error ? error.message : 'Failed to create MercadoPago preference',
            HTTP_STATUS.INTERNAL_ERROR,
            ERROR_CODES.INTERNAL_ERROR
        );
    }
}