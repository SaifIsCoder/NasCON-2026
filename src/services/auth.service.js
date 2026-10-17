'use strict';

/**
 * Authentication Service (Section 5.13, 8.3)
 * Orchestrates user authentication, password verification, and session token generation.
 */

const { UserRepository } = require('../repositories/user.repository');
const { hashPassword, verifyPassword } = require('../utils/password.util');
const { TokenService } = require('./token.service');
const { AuthValidator } = require('../validators/auth.validator');
const { ApiError } = require('../utils/api-error');

class AuthService {
  /**
   * Authenticate user with credentials
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   * @returns {Promise<{ token: string, user: Object }>}
   */
  static async login(credentials) {
    const { email, password } = AuthValidator.validateLogin(credentials);

    const user = await UserRepository.findByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      throw ApiError.unauthorized('Invalid email or password.');
    }

    const token = TokenService.createToken(user, '24h');

    return {
      token,
      user: {
        user_id: user.user_id,
        email: user.email,
        role: user.role,
        tenant_id: user.tenant_id,
        league_id: user.league_id,
        club_id: user.club_id,
        player_id: user.player_id,
      },
    };
  }

  static hashPassword(password) {
    return hashPassword(password);
  }

  static verifyPassword(password, storedHash) {
    return verifyPassword(password, storedHash);
  }

  static generateToken(user, expiresIn = '24h') {
    return TokenService.createToken(user, expiresIn);
  }

  static verifyToken(token) {
    return TokenService.validateToken(token);
  }
}

module.exports = {
  AuthService,
};
