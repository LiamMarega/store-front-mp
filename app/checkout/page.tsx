'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';

// Components
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { ArrowRight, User, CreditCard, Loader2 } from 'lucide-react';

// Checkout components
import { OrderSummary } from '@/components/checkout/order-summary';
import { CustomerInfoSection } from '@/components/checkout/customer-info-section';
import { ShippingAddressSection } from '@/components/checkout/shipping-address-section';
import { BillingAddressSection } from '@/components/checkout/billing-address-section';
import { ShippingMethodsSection } from '@/components/checkout/shipping-methods-section';
import { MercadoPagoPayment } from '@/components/checkout/mercadopago-payment';

// Hooks and types
import { useShippingMethods, useCheckoutProcess } from '@/hooks/use-checkout';
import { customerSchema, CustomerFormData, CheckoutStep } from '@/lib/checkout/types';

export default function CheckoutPage() {
  const router = useRouter();

  // Custom hooks for state management
  const {
    data: shippingData,
    isLoading: isLoadingShippingMethods,
  } = useShippingMethods();

  const shippingMethods = shippingData?.shippingMethods || [];
  const [selectedShippingMethod, setSelectedShippingMethod] = useState<string>('');

  const {
    redirectUrl,
    preferenceId,
    orderCode,
    totalAmount,
    isProcessing,
    error: checkoutError,
    processCheckout,
    resetCheckout,
  } = useCheckoutProcess();

  // Form setup
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: {
      billingSameAsShipping: true,
      shippingCountry: 'US',
      shippingMethodId: '',
    },
  });

  // Initialize selected shipping method when data loads
  useEffect(() => {
    if (shippingData?.selectedShippingMethod && !selectedShippingMethod) {
      setSelectedShippingMethod(shippingData.selectedShippingMethod);
    }
  }, [shippingData?.selectedShippingMethod, selectedShippingMethod]);

  // Update form when shipping method changes
  useEffect(() => {
    if (selectedShippingMethod) {
      setValue('shippingMethodId', selectedShippingMethod);
    }
  }, [selectedShippingMethod, setValue]);

  // Auto-redirect to MercadoPago when redirect URL is available (fallback for old flow)
  useEffect(() => {
    if (redirectUrl && !preferenceId) {
      const timer = setTimeout(() => {
        window.location.href = redirectUrl;
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [redirectUrl, preferenceId]);

  // Handle form submission
  const onSubmit = async (data: CustomerFormData, event?: React.BaseSyntheticEvent) => {
    // Defensivo: evitar cualquier submit nativo que cause refresh
    event?.preventDefault();
    await processCheckout(data, selectedShippingMethod);
  };

  // Handle back to customer info
  const handleBack = () => {
    resetCheckout();
  };

  // Determine current step - show payment if we have orderCode and preferenceId for Checkout Bricks
  const currentStep = (orderCode && preferenceId && totalAmount) ? CheckoutStep.PAYMENT : CheckoutStep.CUSTOMER_INFO;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-cream/30 to-white pt-24 pb-12 sm:py-32">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            <Card className="p-4 sm:p-8">
              <h1 className="text-3xl font-bold text-brand-dark-blue mb-6 font-tango-sans">
                <User className="inline-block w-8 h-8 mr-2 mb-1" />
                {currentStep === CheckoutStep.PAYMENT ? 'Payment' : 'Customer Information'}
              </h1>

              {/* Error Display */}
              {checkoutError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{checkoutError}</p>
                </div>
              )}

              {currentStep === CheckoutStep.CUSTOMER_INFO ? (
                /* Customer Information Form */
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <CustomerInfoSection register={register} errors={errors} />

                  <Separator />

                  <ShippingAddressSection register={register} errors={errors} />

                  <Separator />

                  <BillingAddressSection
                    register={register}
                    errors={errors}
                    watch={watch}
                  />

                  <Separator />

                  <ShippingMethodsSection
                    shippingMethods={shippingMethods}
                    selectedShippingMethod={selectedShippingMethod}
                    isLoadingShippingMethods={isLoadingShippingMethods}
                    onShippingMethodSelect={setSelectedShippingMethod}
                  />

                  <Separator />

                  {/* Payment Method - Solo MercadoPago */}
                  <div className="space-y-4">
                    <h2 className="text-xl font-semibold text-brand-dark-blue">Payment Method</h2>
                    <div className="border-2 border-[#009EE3] rounded-lg p-4 bg-[#009EE3]/10">
                      <div className="flex items-center">
                        <CreditCard className="w-5 h-5 mr-3 text-[#009EE3]" />
                        <div>
                          <p className="font-medium text-[#009EE3]">MercadoPago</p>
                          <p className="text-sm text-gray-600">
                            Pay with credit/debit card or MercadoPago account
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    className="w-full h-12 text-lg font-semibold bg-[#009EE3] hover:bg-[#0085C6]"
                    disabled={isSubmitting || isProcessing}
                  >
                    {isSubmitting || isProcessing ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue to Payment
                        <ArrowRight className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </Button>
                </form>
              ) : (
                /* Payment Step - MercadoPago Checkout Bricks */
                <>
                  {orderCode && totalAmount && preferenceId ? (
                    <MercadoPagoPayment
                      orderCode={orderCode}
                      totalAmount={totalAmount}
                      preferenceId={preferenceId}
                      onBack={handleBack}
                    />
                  ) : redirectUrl ? (
                    // Fallback to redirect flow if preferenceId is not available
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#009EE3] mx-auto mb-4"></div>
                      <h3 className="text-xl font-semibold mb-2">Redirecting to MercadoPago</h3>
                      <p className="text-gray-600 mb-6">
                        You will be redirected to MercadoPago to complete your payment.
                      </p>
                      <div className="space-y-4">
                        <Button
                          onClick={() => window.location.href = redirectUrl}
                          className="bg-[#009EE3] hover:bg-[#0085C6] px-8"
                        >
                          Click here if not redirected automatically
                        </Button>
                        <Button
                          onClick={handleBack}
                          variant="outline"
                          className="w-full"
                        >
                          Go Back
                        </Button>
                      </div>
                      <p className="text-sm text-gray-500 mt-6">
                        Order: {orderCode}
                      </p>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#009EE3] mx-auto mb-4"></div>
                      <p className="text-gray-600">Creating payment preference...</p>
                    </div>
                  )}
                </>
              )}
            </Card>
          </div>

          {/* Order Summary Sidebar */}
          <div className="lg:col-span-1">
            <OrderSummary />
          </div>
        </div>
      </div>
    </div>
  );
}