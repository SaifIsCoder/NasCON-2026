'use strict';

/**
 * Central Router Registry
 * Mounts all domain and audit route modules adhering to the Section 5.1 contract.
 */

const express = require('express');

const healthRoutes = require('./health.routes');
const resetRoutes = require('./reset.routes');
const authRoutes = require('./auth.routes');
const eventsRoutes = require('./events.routes');
const scoresRoutes = require('./scores.routes');
const checkoutRoutes = require('./checkout.routes');
const inventoryRoutes = require('./inventory.routes');
const rbacRoutes = require('./rbac.routes');
const sportsRoutes = require('./sports.routes');
const fixturesRoutes = require('./fixtures.routes');
const leaguesRoutes = require('./leagues.routes');
const standingsRoutes = require('./standings.routes');
const rosterRoutes = require('./roster.routes');
const offlineSyncRoutes = require('./offline-sync.routes');

const router = express.Router();

router.use(healthRoutes);
router.use(resetRoutes);
router.use(authRoutes);
router.use(eventsRoutes);
router.use(scoresRoutes);
router.use(checkoutRoutes);
router.use(inventoryRoutes);
router.use(rbacRoutes);
router.use(sportsRoutes);
router.use(fixturesRoutes);
router.use(leaguesRoutes);
router.use(standingsRoutes);
router.use(rosterRoutes);
router.use(offlineSyncRoutes);

module.exports = router;
