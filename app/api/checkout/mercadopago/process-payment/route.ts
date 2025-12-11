import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { fetchGraphQL } from '@/lib/vendure-server';
import { ADD_PAYMENT_TO_ORDER } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

export async function POST(req: NextRequest) {
    try {
        const env = process.env.MERCADOPAGO_ENV || 'dev';
        const accessToken = env === 'prod'
            ? process.env.MERCADOPAGO_ACCESS_TOKEN_PROD
            : process.env.MERCADOPAGO_ACCESS_TOKEN_DEV;

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

        const body = await req.json();

        // Validate required fields (token is optional for non-card methods like Ticket/Pix if paymentMethodId is present)
        if ((!body.token && !body.paymentMethodId) || !body.email || !body.amount || !body.orderCode) {
            return createErrorResponse(
                'Missing required fields',
                'token OR paymentMethodId, email, amount, and orderCode are required',
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.VALIDATION_ERROR
            );
        }

        const transactionAmount = body.amount / 100;
        const paymentClient = new Payment(mercadopago);

        const paymentData: any = {
            transaction_amount: transactionAmount,
            installments: body.installments || 1,
            description: `Order ${body.orderCode}`,
            payer: {
                email: body.email,
            },
            binary_mode: true,
            external_reference: body.orderCode,
        };

        if (body.token) {
            paymentData.token = body.token;
        }

        if (body.paymentMethodId) {
            paymentData.payment_method_id = body.paymentMethodId;
        }

        if (body.issuerId) {
            paymentData.issuer_id = body.issuerId;
        }

        if (body.identificationType && body.identificationNumber) {
            paymentData.payer.identification = {
                type: body.identificationType,
                number: body.identificationNumber,
            };
        }

        console.log('Creating MercadoPago payment:', {
            amount: transactionAmount,
            email: body.email,
            installments: body.installments,
            orderCode: body.orderCode,
            env,
        });

        // IMPORTANTE: Agregar X-Idempotency-Key para evitar pagos duplicados
        const idempotencyKey = `${body.orderCode}-${Date.now()}`;

        const mpPayment = await paymentClient.create({
            body: paymentData,
            requestOptions: {
                idempotencyKey,
            },
        });

        console.log('MercadoPago payment result:', {
            id: mpPayment.id,
            status: mpPayment.status,
            statusDetail: mpPayment.status_detail,
            env,
        });

        if (mpPayment.status === 'rejected') {
            return createErrorResponse(
                'Payment rejected',
                mpPayment.status_detail || 'Your payment was declined',
                HTTP_STATUS.BAD_REQUEST,
                'PAYMENT_REJECTED',
                { status: mpPayment.status, detail: mpPayment.status_detail }
            );
        }

        // Payment approved or pending - record it in Vendure
        if (mpPayment.status === 'approved' || mpPayment.status === 'in_process' || mpPayment.status === 'pending') {
            const vendureRes = await fetchGraphQL(
                {
                    query: ADD_PAYMENT_TO_ORDER,
                    variables: {
                        input: {
                            method: 'mercadopago',
                            metadata: {
                                paymentId: mpPayment.id?.toString(),
                                status: mpPayment.status,
                                statusDetail: mpPayment.status_detail,
                                transactionAmount: mpPayment.transaction_amount,
                                orderCode: body.orderCode,
                                env,
                            },
                        },
                    },
                },
                { req }
            );

            if (vendureRes.errors?.length) {
                console.error('Vendure addPaymentToOrder error:', vendureRes.errors);
                return createErrorResponse(
                    'Payment recorded but order update failed',
                    'Please contact support with payment ID: ' + mpPayment.id,
                    HTTP_STATUS.INTERNAL_ERROR,
                    'ORDER_UPDATE_FAILED',
                    { paymentId: mpPayment.id, vendureErrors: vendureRes.errors }
                );
            }

            const orderResult = vendureRes.data?.addPaymentToOrder;

            if (orderResult?.__typename === 'Order') {
                const res = NextResponse.json({
                    success: true,
                    paymentId: mpPayment.id,
                    status: mpPayment.status,
                    statusDetail: mpPayment.status_detail,
                    orderCode: body.orderCode,
                    orderState: orderResult.state,
                    env,
                });

                forwardCookies(res, vendureRes);
                return res;
            }

            if (orderResult?.__typename === 'PaymentDeclinedError') {
                return createErrorResponse(
                    'Payment declined by order system',
                    orderResult.paymentErrorMessage || 'Payment was declined',
                    HTTP_STATUS.BAD_REQUEST,
                    'VENDURE_PAYMENT_DECLINED'
                );
            }

            if (orderResult?.__typename === 'PaymentFailedError') {
                return createErrorResponse(
                    'Payment failed in order system',
                    orderResult.paymentErrorMessage || 'Payment failed',
                    HTTP_STATUS.BAD_REQUEST,
                    'VENDURE_PAYMENT_FAILED'
                );
            }
        }

        return createErrorResponse(
            'Unexpected payment status',
            `Payment status: ${mpPayment.status}`,
            HTTP_STATUS.BAD_REQUEST,
            'UNEXPECTED_PAYMENT_STATUS',
            { status: mpPayment.status, detail: mpPayment.status_detail }
        );

    } catch (error) {
        console.error('Error processing MercadoPago payment:', error);

        if (error && typeof error === 'object' && 'cause' in error) {
            const mpError = error as any;
            return createErrorResponse(
                'MercadoPago API error',
                mpError.message || 'Failed to process payment',
                HTTP_STATUS.BAD_REQUEST,
                'MERCADOPAGO_API_ERROR',
                mpError.cause
            );
        }

        return createErrorResponse(
            'Internal server error',
            error instanceof Error ? error.message : 'Failed to process payment',
            HTTP_STATUS.INTERNAL_ERROR,
            ERROR_CODES.INTERNAL_ERROR
        );
    }
}
