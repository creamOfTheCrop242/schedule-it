import { config } from 'dotenv';
config({ path: '.env' });
config({ path: `.env.${process.env.NODE_ENV || 'development'}`, override: true });
