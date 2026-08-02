/**
 * Cookie flags derived from the ACTUAL request, not env vars.
 *
 * Cross-site (Vercel frontend -> Render API) cookies need Secure+SameSite=None;
 * plain-HTTP localhost needs the opposite. Guessing from NODE_ENV/SERVER_URL
 * silently breaks production the moment one env var is copied from .env.
 */
exports.crossSiteCookie = (req) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  return {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? 'None' : 'Lax',
    path: '/',
  };
};
