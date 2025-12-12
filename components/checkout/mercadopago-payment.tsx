'use client';

import { useEffect, useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CreditCard, AlertCircle, Lock, Info } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { getMercadoPagoConfig } from '@/lib/mercadopago-config';

// Brand colors from globals.css
const BRAND_COLORS = {
  primary: '#E56A2C',       // --brand-primary
  secondary: '#7493B2',     // --brand-secondary  
  accent: '#FDA46C',        // --brand-accent
  cream: '#E9E2CF',         // --brand-cream
  darkBlue: '#234465',      // --brand-dark-blue
  white: '#FFFFFF',         // --brand-white
};

// Payer data for initialization
interface PayerData {
  firstName?: string;
  lastName?: string;
  email?: string;
  identification?: {
    type?: string;
    number?: string;
  };
  address?: {
    zipCode?: string;
    federalUnit?: string;
    city?: string;
    neighborhood?: string;
    streetName?: string;
    streetNumber?: string;
    complement?: string;
  };
}

interface MercadoPagoPaymentProps {
  orderCode: string;
  totalAmount: number;
  preferenceId: string;
  onBack?: () => void;
  // Customer data to pre-fill the payment form
  payerData?: PayerData;
}

declare global {
  interface Window {
    paymentBrickController?: { unmount: () => void };
  }
}

export function MercadoPagoPayment({ orderCode, totalAmount, preferenceId, onBack, payerData }: MercadoPagoPaymentProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  const config = getMercadoPagoConfig();
  const publicKey = config.publicKey;
  const isProd = config.isProd;

  useEffect(() => {
    if (!publicKey) {
      setError('MercadoPago public key is not configured');
      setIsLoading(false);
      return;
    }

    try {
      initMercadoPago(publicKey, {
        locale: 'es-AR',
        advancedFraudPrevention: true
      });
      setInitialized(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing MercadoPago:', err);
      setError('Error initializing MercadoPago. Please try again.');
      setIsLoading(false);
    }
    // Note: The @mercadopago/sdk-react handles cleanup internally.
    // Manual unmounting of window.paymentBrickController can cause conflicts.
  }, [publicKey]);

  const handleOnReady = useCallback(() => {
    console.log('Payment Brick ready');
    setIsLoading(false);
  }, []);

  const handleOnError = useCallback((error: any) => {
    console.error('Payment Brick error:', error);
    setError(error?.message || 'Error loading payment form');
  }, []);

  const handleOnSubmit = useCallback(async (formData: any) => {
    setError(null);
    setIsProcessing(true);

    try {
      console.log('Payment Brick formData:', formData);

      // Payment Brick returns data NESTED in formData.formData
      const brickData = formData.formData || formData;

      // Map it to our backend expected format
      const paymentData = {
        token: brickData.token,
        email: brickData.payer?.email || '',
        amount: totalAmount,
        installments: brickData.installments || 1,
        orderCode,
        paymentMethodId: brickData.payment_method_id,
        issuerId: brickData.issuer_id,
        identificationType: brickData.payer?.identification?.type,
        identificationNumber: brickData.payer?.identification?.number,
      };

      console.log('Sending paymentData to backend:', paymentData);

      // Call our backend endpoint to process the payment
      const response = await fetch('/api/checkout/mercadopago/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(paymentData),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || result.details || 'Error procesando el pago.');
      }

      if (result.success) {
        router.push(`/checkout/confirmation/${orderCode}`);
      } else {
        throw new Error(result.message || 'Respuesta inesperada del servidor');
      }
    } catch (err) {
      console.error('Error en pago:', err);
      setError(err instanceof Error ? err.message : 'Error procesando el pago. Intente nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  }, [orderCode, totalAmount, router]);

  if (!publicKey) {
    return (
      <Card className="p-6">
        <div className="flex items-center gap-3 text-red-600">
          <AlertCircle className="w-5 h-5" />
          <p>MercadoPago is not configured. Please contact support.</p>
        </div>
      </Card>
    );
  }

  if (isLoading && !initialized) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-[#009EE3] animate-spin" />
        </div>
        <p className="text-center text-gray-600 mt-4">Loading payment form...</p>
      </Card>
    );
  }

  // Convert amount from cents to currency units for display
  const displayAmount = totalAmount / 100;

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-[#009EE3]" />
          <h2 className="text-xl font-semibold text-brand-dark-blue">Complete your payment</h2>
        </div>

        {!isProd && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-800">Modo de Pruebas</p>
                <p className="text-sm text-yellow-700 mt-1">
                  Usa tarjetas de prueba de MercadoPago:
                </p>
                <ul className="text-xs text-yellow-700 mt-2 space-y-1">
                  <li><strong>APRO:</strong> 5031 7557 3453 0604 - Aprobación inmediata</li>
                  <li><strong>CONT:</strong> 5031 7557 3453 0604 - Requiere autenticación</li>
                  <li><strong>OTHE:</strong> 5031 7557 3453 0604 - Error genérico</li>
                  <li>CVV: 123 | Fecha: 11/25 | Documento: 12345678</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        <div className="border-2 border-[#009EE3] rounded-lg p-6 bg-[#009EE3]/5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-gray-600" />
            <p className="text-sm text-gray-600">
              Your payment information is encrypted and secure
            </p>
          </div>

          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-brand-dark-blue">
              ${displayAmount.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
            </p>
          </div>

          {/* MercadoPago Payment Brick */}
          {initialized && preferenceId && (
            <Payment
              key={preferenceId}
              initialization={{
                amount: displayAmount,
                preferenceId: preferenceId,
                payer: payerData ? {
                  firstName: payerData.firstName,
                  lastName: payerData.lastName,
                  email: payerData.email,
                  identification: payerData.identification,
                  address: payerData.address,
                } as any : undefined,
              }}
              customization={{
                visual: {
                  style: {
                    theme: 'default',
                    customVariables: {
                      // Primary colors - brand orange
                      baseColor: BRAND_COLORS.primary,
                      baseColorFirstVariant: BRAND_COLORS.accent,
                      baseColorSecondVariant: BRAND_COLORS.secondary,
                      // Text colors - dark blue for readability
                      textPrimaryColor: BRAND_COLORS.darkBlue,
                      textSecondaryColor: BRAND_COLORS.secondary,
                      // Background colors
                      formBackgroundColor: BRAND_COLORS.white,
                      inputBackgroundColor: BRAND_COLORS.white,
                      // Button
                      buttonTextColor: BRAND_COLORS.white,
                      // Borders
                      outlinePrimaryColor: BRAND_COLORS.primary,
                      outlineSecondaryColor: BRAND_COLORS.cream,
                      // Status colors
                      successColor: '#00A650',
                      errorColor: '#F23D4F',
                      // Border radius
                      borderRadiusSmall: '4px',
                      borderRadiusMedium: '8px',
                      borderRadiusLarge: '12px',
                      // Padding
                      formPadding: '16px',
                    },
                  },
                },
                // Using type assertion to allow wallet_purchase and onboarding_credits
                // These are valid MercadoPago options but may not be in SDK types
                paymentMethods: {
                  creditCard: "all",
                  debitCard: "all",
                  bankTransfer: "all",
                  wallet_purchase: "all",
                  onboarding_credits: "all",
                  maxInstallments: 12,
                } as any,
              }}
              onReady={handleOnReady}
              onError={handleOnError}
              onSubmit={handleOnSubmit}
            />
          )}

          {isProcessing && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-6 h-6 text-[#009EE3] animate-spin mr-2" />
              <span className="text-gray-600">Processing payment...</span>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg mt-4">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}
        </div>

        {onBack && !isProcessing && (
          <Button onClick={onBack} variant="outline" className="w-full">
            Go Back
          </Button>
        )}

        <p className="text-xs text-gray-500 text-center">
          Order: {orderCode} | Environment: {isProd ? 'Production' : 'Development'}
        </p>
      </div>
    </Card>
  );
}

