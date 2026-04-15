const prisma = require('../config/db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sendSuccess, sendError } = require('../utils/response');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_do_not_use_in_prod';

const FREE_EMAIL_PROVIDERS = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'icloud.com', 'aol.com'];

// Register a new user (B2B Client)
const register = async (req, res, next) => {
  try {
    const { email, password, businessName, phoneNumber, gstNumber } = req.body;

    if (!email || !password || !businessName || !phoneNumber) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Email, password, business name, and phone number are required');
    }

    // Block free email providers
    const domain = email.split('@')[1];
    if (!domain || FREE_EMAIL_PROVIDERS.includes(domain.toLowerCase())) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Please register with a corporate/business email address');
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      return sendError(res, 409, 'CONFLICT', 'User with this email already exists');
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    // Creating initial user (role CLIENT, defaults to FREE plan)
    const newUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        businessName,
        phoneNumber,
        gstNumber,
        role: 'CLIENT',
        plan: 'FREE',
        isActive: false // Important! User must be approved by admin
      },
      select: {
        id: true,
        email: true,
        businessName: true,
        role: true,
        plan: true,
        isActive: true,
        createdAt: true
      }
    });

    // Mock Email sending for Admin approval
    console.log(`[EMAIL MOCK] Admin Notification: New business registered => ${businessName} (${email}). Please approve via Admin Panel.`);
    console.log(`[EMAIL MOCK] User Notification: Welcome to All India Villages API! We are reviewing your registration for ${businessName}.`);

    return sendSuccess(res, newUser, 'User registered successfully. Pending Admin approval.');
  } catch (error) {
    next(error);
  }
};

// Login user
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return sendError(res, 400, 'VALIDATION_ERROR', 'Email and password are required');
    }

    const user = await prisma.user.findUnique({
      where: { email }
    });

    if (!user) {
      return sendError(res, 401, 'AUTH_FAILED', 'Invalid credentials');
    }

    // Verify password
    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return sendError(res, 401, 'AUTH_FAILED', 'Invalid credentials');
    }

    // Check if user is active (approved by admin)
    // EXCEPTION: If the user is an admin, let them login immediately to approve others
    if (!user.isActive && user.role !== 'ADMIN') {
      return sendError(res, 403, 'FORBIDDEN', 'Your account is pending admin approval or has been suspended.');
    }

    // Generate JWT
    const payload = {
      id: user.id,
      email: user.email,
      role: user.role,
      plan: user.plan
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    return sendSuccess(res, {
      user: payload,
      token
    }, 'Login successful');

  } catch (error) {
    next(error);
  }
};

// Seed an initial admin user (Helper for first-time setup)
const seedAdmin = async (req, res, next) => {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@villagesapi.com';
    const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@123!';

    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail }
    });

    if (existingAdmin) {
      return sendSuccess(res, { email: adminEmail }, 'Admin already exists');
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const admin = await prisma.user.create({
      data: {
        email: adminEmail,
        passwordHash,
        role: 'ADMIN',
        plan: 'UNLIMITED',
        isActive: true
      },
      select: { id: true, email: true, role: true }
    });

    return sendSuccess(res, admin, 'Initial admin user created successfully');
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  seedAdmin
};
