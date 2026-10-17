'use strict';

/**
 * Token Management Service (Section 5.13, 8.3)
 */

const { generateToken, verifyToken, JWT_SECRET } = require('../utils/jwt.util');

class TokenService {
  static createToken(user, expiresIn = '24h') {
    return generateToken(user, expiresIn);
  }

  static validateToken(token) {
    return verifyToken(token);
  }

  static getSecret() {
    return JWT_SECRET;
  }
}

module.exports = {
  TokenService,
};
