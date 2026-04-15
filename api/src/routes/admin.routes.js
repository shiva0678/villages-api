const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Protect all admin routes
router.use(requireAuth, requireAdmin);

// Dashboard stats map to the Recharts on frontend
router.get('/stats', adminController.getStats);

// User Management
router.get('/users', adminController.getUsers);
router.get('/usage-alerts', adminController.getUsageAlerts);
router.put('/users/:id', adminController.updateUser);

// Village Master List
router.get('/villages', adminController.getVillages);

// API Logs Viewer
router.get('/logs', adminController.getLogs);

module.exports = router;
