require('dotenv').config();
const { z } = require('zod');

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(4000),
  CLIENT_URL: z.string().min(1),
  SERVER_URL: z.string().optional(),

  MONGO_URI: z.string().min(1, 'MONGO_URI is required'),

  JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 32 chars'),
  SUPER_ADMIN_JWT_SECRET: z.string().min(16),
  PLATFORM_SECRET: z.string().min(16),
  OASES_ENCRYPT_KEY: z.string().length(64).optional(), // 32-byte hex

  REDIS_URL: z.string().default('redis://127.0.0.1:6379'),
  REDIS_DISABLED: z.coerce.boolean().default(false),

  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().default(587),
  SMTP_SECURE: z.coerce.boolean().default(false),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().optional(),

  // Preferred over SMTP wherever outbound mail ports are blocked (Render)
  RESEND_API_KEY: z.string().optional(),
  EMAIL_TRANSPORT: z.enum(['smtp', 'resend']).optional(),

  CLOUDINARY_CLOUD_NAME: z.string().optional(),
  CLOUDINARY_API_KEY: z.string().optional(),
  CLOUDINARY_API_SECRET: z.string().optional(),

  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),
  RAZORPAY_WEBHOOK_SECRET: z.string().optional(),

  AWS_ACCESS_KEY_ID: z.string().optional(),
  AWS_SECRET_ACCESS_KEY: z.string().optional(),
  AWS_REGION: z.string().optional(),
  AWS_S3_BUCKET: z.string().optional(),

  CLOUDFRONT_DOMAIN: z.string().optional(),
  S3_BUCKET_DOMAIN: z.string().optional(),
});

// Accept the legacy aliases your code still reads, so nothing breaks today.
const raw = {
  ...process.env,
  MONGO_URI:
    process.env.MONGO_URI ||
    process.env.MONGODB_URI ||
    process.env.MONGO_URL ||
    process.env.DATABASE_URL ||
    process.env.DB_URL,
};

const parsed = schema.safeParse(raw);

if (!parsed.success) {
  console.error('\n❌ Invalid environment configuration:\n');
  for (const [key, errs] of Object.entries(parsed.error.flatten().fieldErrors)) {
    console.error(`   ${key}: ${errs.join(', ')}`);
  }
  console.error('\nFix your .env (see .env.example) and restart.\n');
  process.exit(1);
}

module.exports = parsed.data;
