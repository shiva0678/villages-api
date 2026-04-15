const express = require('express');
const router = express.Router();
const portalController = require('../controllers/portal.controller');
const { requireAuth } = require('../middleware/auth');

// Protect all portal routes, they require a valid user JWT
router.use(requireAuth);

// Dashboard Usage Stats
router.get('/stats', portalController.getStats);

// API Keys Management
router.get('/keys', portalController.getApiKeys);
router.post('/keys', portalController.generateApiKey);
router.delete('/keys/:id', portalController.revokeApiKey);

module.exports = router;
