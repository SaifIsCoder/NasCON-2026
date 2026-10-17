'use strict';

/**
 * RBAC Matrix & Probe Routes (Section 5.13)
 */

const express = require('express');
const { RbacController } = require('../controllers/rbac.controller');
const { authenticate } = require('../middlewares/authenticate.middleware');

const router = express.Router();

// Autograder Matrix Generation (Section 5.13)
router.post('/audit/v1/rbac-matrix', RbacController.getRbacMatrix);

// P1: POST /audit/v1/rbac/tenants
router.post('/audit/v1/rbac/tenants', authenticate, RbacController.probe('P1'));

// P2: POST /audit/v1/rbac/leagues/:league_id/fixtures
router.post('/audit/v1/rbac/leagues/:league_id/fixtures', authenticate, RbacController.probe('P2'));

// P3: POST /audit/v1/rbac/clubs/:club_id/roster
router.post('/audit/v1/rbac/clubs/:club_id/roster', authenticate, RbacController.probe('P3'));

// P4: POST /audit/v1/rbac/clubs/:club_id/products
router.post('/audit/v1/rbac/clubs/:club_id/products', authenticate, RbacController.probe('P4'));

// P5: PATCH /audit/v1/rbac/players/:player_id
router.patch('/audit/v1/rbac/players/:player_id', authenticate, RbacController.probe('P5'));

// P6: GET /audit/v1/rbac/clubs/:club_id
router.get('/audit/v1/rbac/clubs/:club_id', authenticate, RbacController.probe('P6'));

// P7: GET /audit/v1/rbac/platform/config
router.get('/audit/v1/rbac/platform/config', authenticate, RbacController.probe('P7'));

module.exports = router;
