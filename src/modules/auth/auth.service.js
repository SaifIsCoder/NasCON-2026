'use strict';

/**
 * Backward-Compatibility Bridge for Auth Module
 * Re-exports from src/services/auth.service, src/services/rbac.service, src/services/token.service, and src/utils/
 */

const { AuthService } = require('../../services/auth.service');
const { RbacService } = require('../../services/rbac.service');
const { TokenService } = require('../../services/token.service');
const { hashPassword, verifyPassword } = require('../../utils/password.util');
const { generateToken, verifyToken, JWT_SECRET } = require('../../utils/jwt.util');
const { ApiError } = require('../../utils/api-error');

function throwForbidden(message = 'Access denied.') {
  throw ApiError.forbidden(message);
}

module.exports = {
  login: AuthService.login.bind(AuthService),
  getRbacMatrix: RbacService.getRbacMatrix.bind(RbacService),
  authorizeProbe: RbacService.authorizeProbe.bind(RbacService),
  hashPassword,
  verifyPassword,
  generateToken,
  verifyToken,
  throwForbidden,
  JWT_SECRET,
};
