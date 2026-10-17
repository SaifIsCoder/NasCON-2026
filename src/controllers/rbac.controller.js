'use strict';

/**
 * RBAC Matrix & Authorization Probes Controller (Section 5.13)
 */

const { RbacService } = require('../services/rbac.service');
const { HTTP_STATUS } = require('../constants/http-status.constants');

class RbacController {
  static async getRbacMatrix(req, res, next) {
    try {
      const matrix = await RbacService.getRbacMatrix();
      res.status(HTTP_STATUS.OK).json(matrix);
    } catch (err) {
      next(err);
    }
  }

  static probe(probeId) {
    return async (req, res, next) => {
      try {
        await RbacService.authorizeProbe(probeId, req.user, req.params);
        res.status(HTTP_STATUS.OK).json({ authorized: true });
      } catch (err) {
        next(err);
      }
    };
  }
}

module.exports = {
  RbacController,
};
