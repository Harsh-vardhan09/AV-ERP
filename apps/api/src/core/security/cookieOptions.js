// Derived from the actual request, not env vars: cross-site (Vercel -> Render) needs
// Secure+SameSite=None, localhost needs the opposite, and NODE_ENV guesses wrong
exports.crossSiteCookie = (req) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'None' : 'Lax',
    path: '/',
  };
};
