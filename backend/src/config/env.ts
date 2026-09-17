import dotenv from 'dotenv';
dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || 'mi-secreto-super-seguro-para-el-gimnasio-2024';

export const env = {
  PORT: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  DATABASE_URL: process.env.DATABASE_URL as string,
  JWT_SECRET: JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '7d',
  ADMIN_EMAIL: process.env.ADMIN_EMAIL || 'admin@gym.com',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || '123456',
  ADMIN_NAME: process.env.ADMIN_NAME || 'postgres',
  PLAN_2VECES_PRICE: process.env.PLAN_2VECES_PRICE ? parseFloat(process.env.PLAN_2VECES_PRICE) : 0,
  PLAN_3VECES_PRICE: process.env.PLAN_3VECES_PRICE ? parseFloat(process.env.PLAN_3VECES_PRICE) : 0,
  PLAN_FULL_PRICE: process.env.PLAN_FULL_PRICE ? parseFloat(process.env.PLAN_FULL_PRICE) : 0,
} as const;