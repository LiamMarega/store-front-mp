'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, CreditCard, AlertCircle, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { initMercadoPago, CardNumber, ExpirationDate, SecurityCode, createCardToken } from '@mercadopago/sdk-react';

interface MercadoPagoPaymentProps {
  orderCode: string;
  totalAmount: number;
  onBack?: () => void;
}

declare global {
  interface Window {
    MercadoPago: any;
  }
}

export function MercadoPagoPayment({ orderCode, totalAmount, onBack }: MercadoPagoPaymentProps) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cardholderName, setCardholderName] = useState('');
  const [cardholderEmail, setCardholderEmail] = useState('');
  const [identificationType, setIdentificationType] = useState('');
  const [identificationNumber, setIdentificationNumber] = useState('');
  const [installments, setInstallments] = useState('1');
  const [initialized, setInitialized] = useState(false);

  const publicKey = process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY || '';

  useEffect(() => {
    if (!publicKey) {
      setError('MercadoPago public key is not configured');
      setIsLoading(false);
      return;
    }

    try {
      initMercadoPago(publicKey, { locale: 'es-AR' });
      setInitialized(true);
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing MercadoPago:', err);
      setError('Error initializing MercadoPago. Please try again.');
      setIsLoading(false);
    }
  }, [publicKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsProcessing(true);

    try {
      if (!initialized) throw new Error('El formulario de pago aún no está listo.');
      if (!cardholderName) throw new Error('Ingresa el nombre del titular.');
      if (!cardholderEmail) throw new Error('Ingresa el email del titular.');

      // Generate card token using MercadoPago SDK
      const tokenResponse = await createCardToken({
        cardholderName,
        identificationType,
        identificationNumber,
      });

      const tokenId = tokenResponse?.id;
      const paymentMethodId = (tokenResponse as any)?.card?.payment_method?.id || (tokenResponse as any)?.payment_method_id;
      const issuerId =
        (tokenResponse as any)?.card?.issuer?.id ||
        (tokenResponse as any)?.issuer_id ||
        (tokenResponse as any)?.issuer?.id;

      if (!tokenId) {
        throw new Error('No se pudo generar el token de la tarjeta.');
      }

      // Call our backend endpoint to process the payment with MercadoPago API
      const response = await fetch('/api/checkout/mercadopago/process-payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          token: tokenId,
          email: cardholderEmail,
          amount: totalAmount,
          installments: Number(installments) || 1,
          orderCode,
          paymentMethodId,
          issuerId,
          identificationType,
          identificationNumber,
        }),
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
  };

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

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-8 h-8 text-[#009EE3] animate-spin" />
        </div>
        <p className="text-center text-gray-600 mt-4">Loading payment form...</p>
      </Card>
    );
  }

  if (error && !isProcessing) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-red-600">
            <AlertCircle className="w-5 h-5" />
            <p>{error}</p>
          </div>
          {onBack && (
            <Button onClick={onBack} variant="outline">
              Go Back
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <CreditCard className="w-6 h-6 text-[#009EE3]" />
          <h2 className="text-xl font-semibold text-brand-dark-blue">Complete your payment</h2>
        </div>

        <div className="border-2 border-[#009EE3] rounded-lg p-6 bg-[#009EE3]/5">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="w-4 h-4 text-gray-600" />
            <p className="text-sm text-gray-600">
              Your payment information is encrypted and secure
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Card fields via @mercadopago/sdk-react */}
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Número de tarjeta
                </label>
                <div className="h-12 px-3 py-2 border border-gray-300 rounded-lg flex items-center">
                  <CardNumber placeholder="1234 1234 1234 1234" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Fecha de vencimiento
                  </label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-lg flex items-center">
                    <ExpirationDate placeholder="MM/AA" />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Código de seguridad
                  </label>
                  <div className="h-12 px-3 py-2 border border-gray-300 rounded-lg flex items-center">
                    <SecurityCode placeholder="CVC" />
                  </div>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Titular de la tarjeta
                </label>
                <input
                  type="text"
                  className="w-full h-12 px-3 border border-gray-300 rounded-lg"
                  placeholder="Nombre y apellido"
                  value={cardholderName}
                  onChange={(e) => setCardholderName(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Email del titular
                </label>
                <input
                  type="email"
                  className="w-full h-12 px-3 border border-gray-300 rounded-lg"
                  placeholder="correo@ejemplo.com"
                  value={cardholderEmail}
                  onChange={(e) => setCardholderEmail(e.target.value)}
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Tipo de documento
                  </label>
                  <input
                    type="text"
                    className="w-full h-12 px-3 border border-gray-300 rounded-lg"
                    placeholder="DNI / CUIT"
                    value={identificationType}
                    onChange={(e) => setIdentificationType(e.target.value)}
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 mb-2 block">
                    Número de documento
                  </label>
                  <input
                    type="text"
                    className="w-full h-12 px-3 border border-gray-300 rounded-lg"
                    placeholder="12345678"
                    value={identificationNumber}
                    onChange={(e) => setIdentificationNumber(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Cuotas
                </label>
                <input
                  type="number"
                  min={1}
                  className="w-full h-12 px-3 border border-gray-300 rounded-lg"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                />
              </div>
            </div>

            {/* Error display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit button */}
            <Button
              type="submit"
              className="w-full h-12 text-lg font-semibold bg-[#009EE3] hover:bg-[#0085C6]"
              disabled={isProcessing || !initialized}
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Processing Payment...
                </>
              ) : (
                <>
                  Pay ${(totalAmount / 100).toFixed(2)}
                </>
              )}
            </Button>
          </form>
        </div>

        {onBack && !isProcessing && (
          <Button onClick={onBack} variant="outline" className="w-full">
            Go Back
          </Button>
        )}

        <p className="text-xs text-gray-500 text-center">
          Order: {orderCode}
        </p>
      </div>
    </Card>
  );
}
