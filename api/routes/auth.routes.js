const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);

// Helper route to create the first admin user
router.post('/seed-admin', authController.seedAdmin);

module.exports = router;
