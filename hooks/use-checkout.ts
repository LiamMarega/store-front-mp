import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useCallback } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { CustomerFormData, ShippingMethod } from '@/lib/checkout/types';

// Query keys
export const checkoutKeys = {
  all: ['checkout'] as const,
  shippingMethods: () => [...checkoutKeys.all, 'shipping-methods'] as const,
};

// Types
interface PaymentIntentData {
  clientSecret?: string;
  redirectUrl?: string;
  preferenceId?: string;
  orderCode: string;
  amount?: number;
  currency?: string;
}

// API functions
async function fetchShippingMethods(): Promise<{ eligibleShippingMethods: ShippingMethod[] }> {
  const response = await fetch('/api/checkout/shipping-methods', {
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    const data = await response.json();
    throw new Error(data.error || 'Failed to load shipping methods');
  }

  return response.json();
}

async function setCustomer(customerData: {
  firstName: string;
  lastName: string;
  emailAddress: string;
  phoneNumber?: string;
}): Promise<any> {
  const response = await fetch('/api/checkout/set-customer', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(customerData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set customer');
  }

  return data;
}

async function setShippingAddress(addressData: CustomerFormData): Promise<any> {
  const response = await fetch('/api/checkout/set-shipping-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(addressData),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set shipping address');
  }

  return data;
}

async function setShippingMethod(shippingMethodId: string): Promise<any> {
  const response = await fetch('/api/checkout/shipping-methods', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ shippingMethodIds: [shippingMethodId] }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Failed to set shipping method');
  }

  return data;
}

async function createPaymentIntent(paymentMethod: string = 'stripe'): Promise<PaymentIntentData> {
  const response = await fetch('/api/checkout/payment-intent', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ paymentMethod }),
  });

  const data = await response.json();

  if (!response.ok) {
    const errorMsg = data.details || data.error || 'Failed to create payment intent';
    throw new Error(errorMsg);
  }

  // Validate response based on payment method
  if (paymentMethod === 'stripe' && !data.clientSecret) {
    throw new Error('No client secret received');
  }

  if (paymentMethod === 'mercadopago' && !data.preferenceId && !data.redirectUrl) {
    throw new Error('No preference ID or redirect URL received');
  }

  return data;
}

// Hooks
export function useShippingMethods() {
  return useQuery({
    queryKey: checkoutKeys.shippingMethods(),
    queryFn: fetchShippingMethods,
    staleTime: 5 * 60 * 1000,
    select: (data) => ({
      shippingMethods: data.eligibleShippingMethods || [],
      selectedShippingMethod: data.eligibleShippingMethods?.[0]?.id || '',
    }),
  });
}

export function useCheckoutProcess() {
  const queryClient = useQueryClient();
  const { openAuthModal, isAuthenticated } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [redirectUrl, setRedirectUrl] = useState<string | null>(null);
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [orderCode, setOrderCode] = useState<string | null>(null);
  const [totalAmount, setTotalAmount] = useState<number | null>(null);
  const [customerData, setCustomerData] = useState<CustomerFormData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const setCustomerMutation = useMutation({
    mutationFn: setCustomer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const setShippingAddressMutation = useMutation({
    mutationFn: setShippingAddress,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const setShippingMethodMutation = useMutation({
    mutationFn: setShippingMethod,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  const createPaymentIntentMutation = useMutation({
    mutationFn: ({ paymentMethod }: { paymentMethod: string }) => createPaymentIntent(paymentMethod),
  });

  const processCheckout = useCallback(
    async (data: CustomerFormData, selectedShippingMethod: string) => {
      setError(null);

      try {
        // Set customer information only if user is not authenticated
        if (!isAuthenticated) {
          await setCustomerMutation.mutateAsync({
            firstName: data.firstName,
            lastName: data.lastName,
            emailAddress: data.emailAddress,
            phoneNumber: data.shippingPhoneNumber,
          });
        }

        // Set shipping address (includes billing if needed)
        await setShippingAddressMutation.mutateAsync(data);

        // Set shipping method
        if (selectedShippingMethod) {
          await setShippingMethodMutation.mutateAsync(selectedShippingMethod);
        }

        // Process MercadoPago payment - just prepare order for payment
        const response = await fetch('/api/checkout/mercadopago', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || 'Failed to prepare MercadoPago payment');
        }

        // Store preference data for Checkout Bricks
        setOrderCode(result.orderCode);
        // Store customer data for Payment Brick payer initialization
        setCustomerData(data);
        if (result.totalAmount) {
          setTotalAmount(result.totalAmount);
        }
        // Store the actual preferenceId for the Payment Brick
        if (result.preferenceId) {
          setPreferenceId(result.preferenceId);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'An error occurred during checkout';
        setError(errorMessage);
        throw err;
      }
    },
    [setCustomerMutation, setShippingAddressMutation, setShippingMethodMutation, openAuthModal, isAuthenticated]
  );
  const resetCheckout = useCallback(() => {
    setClientSecret(null);
    setRedirectUrl(null);
    setPreferenceId(null);
    setOrderCode(null);
    setTotalAmount(null);
    setCustomerData(null);
    setError(null);
  }, []);

  return {
    clientSecret,
    redirectUrl,
    preferenceId,
    orderCode,
    totalAmount,
    customerData,
    isProcessing:
      setCustomerMutation.isPending ||
      setShippingAddressMutation.isPending ||
      setShippingMethodMutation.isPending ||
      createPaymentIntentMutation.isPending,
    error,
    processCheckout,
    resetCheckout,
    setError,
  };
}
