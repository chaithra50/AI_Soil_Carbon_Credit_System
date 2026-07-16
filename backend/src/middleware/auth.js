const jwt = require('jsonwebtoken');
const env = require('../config/env');
const ApiError = require('../utils/apiError');

function extractToken(req) {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!token) throw ApiError.unauthorized('Missing access token');

  try {
    const payload = jwt.verify(token, env.JWT_ACCESS_SECRET);
    req.user = { id: payload.sub, role: payload.role, email: payload.email };
    next();
  } catch (err) {
    throw ApiError.unauthorized('Invalid or expired access token');
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) throw ApiError.unauthorized();
    if (!roles.includes(req.user.role)) throw ApiError.forbidden(`Requires role: ${roles.join(' or ')}`);
    next();
  };
}

module.exports = { requireAuth, requireRole };
