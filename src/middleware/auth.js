'use strict';

/**
 * Reusable Authentication and Authorization Middleware
 * Enforces five-role RBAC, tenant isolation, and ownership boundaries.
 */

const { verifyToken } = require('../modules/auth/auth.service');

/**
 * Middleware to authenticate requests via JWT Bearer token in Authorization header.
 * Rejects missing, malformed, tampered, expired, or alg:none tokens with HTTP 401.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || typeof authHeader !== 'string') {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Missing Authorization header.',
        details: {},
      },
    });
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer' || !parts[1].trim()) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Invalid Authorization header format. Expected Bearer <token>.',
        details: {},
      },
    });
  }

  const token = parts[1].trim();

  try {
    const decoded = verifyToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHENTICATED',
        message: 'Token is invalid, tampered, expired, or uses an unsupported algorithm.',
        details: {},
      },
    });
  }
}

/**
 * Middleware to require one or more specific roles.
 * super_admin always bypasses role checks.
 */
function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required.',
          details: {},
        },
      });
    }

    if (req.user.role === 'super_admin' || roles.includes(req.user.role)) {
      return next();
    }

    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Role not authorized for this operation.',
        details: {},
      },
    });
  };
}

/**
 * Middleware to enforce strict tenant isolation.
 * Non-super-admins cannot access or modify resources belonging to another tenant.
 */
function requireTenantIsolation(getTenantId) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHENTICATED',
          message: 'Authentication required.',
          details: {},
        },
      });
    }

    if (req.user.role === 'super_admin') {
      return next();
    }

    const targetTenantId = typeof getTenantId === 'function' ? getTenantId(req) : req.params.tenant_id;
    if (targetTenantId && targetTenantId !== req.user.tenant_id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Cross-tenant access forbidden.',
          details: {},
        },
      });
    }

    next();
  };
}

module.exports = {
  authenticate,
  requireRole,
  requireTenantIsolation,
};
