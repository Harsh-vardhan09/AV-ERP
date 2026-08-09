const { ALLOWED_ORIGINS } = require('./cors');

const CF_DOMAIN = process.env.CLOUDFRONT_DOMAIN || '';
const S3_DOMAIN = process.env.S3_BUCKET_DOMAIN || '';

module.exports = {
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://res.cloudinary.com',
               CF_DOMAIN, S3_DOMAIN, 'https://*.razorpay.com'].filter(Boolean),
      connectSrc: ["'self'", ...ALLOWED_ORIGINS,
                   'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameSrc: ["'self'", 'https://api.razorpay.com', 'https://checkout.razorpay.com'],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  frameguard: false,        // Razorpay checkout modal needs to iframe
  xssFilter: true,
  hidePoweredBy: true,
};