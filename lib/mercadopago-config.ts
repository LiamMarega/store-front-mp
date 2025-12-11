export const getMercadoPagoConfig = () => {
  const env = process.env.MERCADOPAGO_ENV || 'dev';
  const isProd = env === 'prod';

  return {
    env,
    isProd,
    publicKey: isProd
      ? process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_PROD
      : process.env.NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY_DEV,
    accessToken: isProd
      ? process.env.MERCADOPAGO_ACCESS_TOKEN_PROD
      : process.env.MERCADOPAGO_ACCESS_TOKEN_DEV,
    // Tarjetas de prueba para desarrollo
    testCards: {
      approved: {
        number: '5031 7557 3453 0604',
        expiration: '11/25',
        cvv: '123',
        holder: 'APRO',
        document: '12345678',
      },
      pending: {
        number: '5031 7557 3453 0604',
        expiration: '11/25',
        cvv: '123',
        holder: 'CONT',
        document: '12345678',
      },
    },
  };
};

