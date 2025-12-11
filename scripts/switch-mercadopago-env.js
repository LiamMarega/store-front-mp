const fs = require('fs');
const path = require('path');

const envFiles = {
  development: '.env.development',
  production: '.env.production'
};

function switchEnvironment(targetEnv) {
  const envFile = envFiles[targetEnv];
  const envPath = path.join(__dirname, '..', '.env');
  
  if (!fs.existsSync(`.env.${targetEnv}`)) {
    console.error(`Environment file .env.${targetEnv} not found`);
    return;
  }
  
  const envContent = fs.readFileSync(`.env.${targetEnv}`, 'utf8');
  fs.writeFileSync(envPath, envContent);
  
  console.log(`✓ Switched to ${targetEnv} environment`);
  console.log('Please restart your development servers');
}

// Usage: node scripts/switch-mercadopago-env.js [dev|prod]
const targetEnv = process.argv[2] || 'dev';
switchEnvironment(targetEnv);
