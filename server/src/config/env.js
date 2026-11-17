import dotenv from 'dotenv';
dotenv.config();

export const ENV = {
  PORT: parseInt(process.env.PORT || '5000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: process.env.DATABASE_URL || '',
  DATABASE_URL_DEMO: process.env.DATABASE_URL_DEMO || '',
  JWT_SECRET: process.env.JWT_SECRET || 'agri_procure_jwt_secret_dev_fallback_2026',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '2h',
  FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:5173',
  CRON_SECRET: process.env.CRON_SECRET || 'agri_cron_secret_token_12345',
  DEMO_MODE: process.env.DEMO_MODE === 'true',
  BREVO_API_KEY: process.env.BREVO_API_KEY || '',
  EMAIL_FROM: process.env.EMAIL_FROM || 'notifications@agriprocure.local',
};
