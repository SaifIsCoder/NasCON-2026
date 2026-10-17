'use strict';

/**
 * Authentication Input Validator (Section 8.3)
 */

const { ApiError } = require('../utils/api-error');

class AuthValidator {
  static validateLogin(body) {
    if (!body || typeof body !== 'object') {
      throw ApiError.badRequest('Request body must be a JSON object.');
    }

    const { email, password } = body;

    if (!email || typeof email !== 'string' || !email.trim()) {
      throw ApiError.badRequest('Email is required.', { fields: ['email'] });
    }

    if (!password || typeof password !== 'string') {
      throw ApiError.badRequest('Password is required.', { fields: ['password'] });
    }

    return {
      email: email.trim().toLowerCase(),
      password,
    };
  }
}

module.exports = {
  AuthValidator,
};
