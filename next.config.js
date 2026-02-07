const fs = require('fs');
const path = require('path');

function loadStripeSecretKey() {
  if (process.env.STRIPE_SECRET_KEY) return process.env.STRIPE_SECRET_KEY.trim();
  try {
    const envPath = path.join(process.cwd(), '.env.local');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split(/\r?\n/)) {
        const trimmed = line.trim();
        if (trimmed.startsWith('STRIPE_SECRET_KEY=')) {
          const val = trimmed.slice('STRIPE_SECRET_KEY='.length).trim().replace(/^["']|["']$/g, '');
          if (val) return val;
        }
      }
    }
  } catch (e) {
    console.warn('next.config: could not read STRIPE_SECRET_KEY from .env.local', e.message);
  }
  return '';
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    STRIPE_SECRET_KEY: loadStripeSecretKey(),
  },
};

module.exports = nextConfig;