import { NextRequest, NextResponse } from 'next/server';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import { fetchGraphQL } from '@/lib/vendure-server';
import { ADD_PAYMENT_TO_ORDER } from '@/lib/graphql/mutations';
import { createErrorResponse, forwardCookies, HTTP_STATUS, ERROR_CODES } from '@/lib/api-utils';

// Initialize MercadoPago client
const mercadopago = new MercadoPagoConfig({
    accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN || '',
});

interface ProcessPaymentBody {
    token: string;
    email: string;
    amount: number;
    installments: number;
    orderCode: string;
    paymentMethodId?: string;
    issuerId?: string;
    identificationType?: string;
    identificationNumber?: string;
}

export async function POST(req: NextRequest) {
    try {
        // Validate access token
        if (!process.env.MERCADOPAGO_ACCESS_TOKEN) {
            return createErrorResponse(
                'MercadoPago not configured',
                'MERCADOPAGO_ACCESS_TOKEN is not set',
                HTTP_STATUS.INTERNAL_ERROR,
                'MERCADOPAGO_CONFIG_ERROR'
            );
        }

        // Parse request body
        const body: ProcessPaymentBody = await req.json();

        // Validate required fields
        if (!body.token || !body.email || !body.amount || !body.orderCode) {
            return createErrorResponse(
                'Missing required fields',
                'token, email, amount, and orderCode are required',
                HTTP_STATUS.BAD_REQUEST,
                ERROR_CODES.VALIDATION_ERROR
            );
        }

        // Convert amount from cents to currency units (MercadoPago expects actual amount)
        const transactionAmount = body.amount / 100;

        // Create payment with MercadoPago API
        const paymentClient = new Payment(mercadopago);

        const paymentData: any = {
            token: body.token,
            transaction_amount: transactionAmount,
            installments: body.installments || 1,
            payer: {
                email: body.email,
            },
        };

        // Add optional fields if provided
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
        });

        const mpPayment = await paymentClient.create({ body: paymentData });

        console.log('MercadoPago payment result:', {
            id: mpPayment.id,
            status: mpPayment.status,
            statusDetail: mpPayment.status_detail,
        });

        // Check payment status
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
            // Add payment to order in Vendure
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
                            },
                        },
                    },
                },
                { req }
            );

            if (vendureRes.errors?.length) {
                console.error('Vendure addPaymentToOrder error:', vendureRes.errors);
                // Payment was successful in MercadoPago but failed to record in Vendure
                // This is a critical error - payment was taken but order not updated
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
                    orderCode: body.orderCode,
                    orderState: orderResult.state,
                });

                forwardCookies(res, vendureRes);
                return res;
            }

            // Handle Vendure payment errors
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

            if (orderResult?.__typename === 'OrderPaymentStateError') {
                return createErrorResponse(
                    'Order payment state error',
                    orderResult.message || 'Invalid order state for payment',
                    HTTP_STATUS.CONFLICT,
                    'ORDER_PAYMENT_STATE_ERROR'
                );
            }
        }

        // Unexpected status
        return createErrorResponse(
            'Unexpected payment status',
            `Payment status: ${mpPayment.status}`,
            HTTP_STATUS.BAD_REQUEST,
            'UNEXPECTED_PAYMENT_STATUS',
            { status: mpPayment.status, detail: mpPayment.status_detail }
        );

    } catch (error) {
        console.error('Error processing MercadoPago payment:', error);

        // Handle MercadoPago API errors
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
