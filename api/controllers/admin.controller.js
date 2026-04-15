const prisma = require('../config/db');
const { sendSuccess, sendError } = require('../utils/response');

// GET /admin/stats
const getStats = async (req, res, next) => {
  try {
    // Basic Counts
    const totalUsers = await prisma.user.count({ where: { role: 'CLIENT' } });
    const pendingUsers = await prisma.user.count({ where: { role: 'CLIENT', isActive: false } });
    const totalVillages = await prisma.village.count();
    const totalApiLogs = await prisma.apiLog.count();

    // Api Calls over last 7 days (Mock aggregation for Recharts)
    // In production we'd group by Date(createdAt) using raw SQL
    // Since NeonDB is PostgreSQL, we can use Prisma raw
    const callsOverTimeRaw = await prisma.$queryRaw`
      SELECT DATE(date_trunc('day', "createdAt")) as name, COUNT(*)::int as calls 
      FROM "ApiLog" 
      WHERE "createdAt" >= NOW() - INTERVAL '7 days'
      GROUP BY name 
      ORDER BY name ASC
    `;
    
    // If no logs yet, send placeholder data
    const callsOverTime = callsOverTimeRaw.length > 0 ? callsOverTimeRaw : [
      { name: 'Mon', calls: 120 }, { name: 'Tue', calls: 350 }, 
      { name: 'Wed', calls: 200 }, { name: 'Thu', calls: 500 }
    ];

    // Plan distribution
    const plansDistribution = await prisma.user.groupBy({
      by: ['plan'],
      _count: { plan: true },
      where: { role: 'CLIENT' }
    });
    
    const formattedPlans = plansDistribution.length > 0 ? plansDistribution.map(p => ({
      name: p.plan,
      value: p._count.plan
    })) : [{ name: 'FREE', value: 1 }];

    return sendSuccess(res, {
      metrics: {
        totalUsers,
        pendingUsers,
        totalVillages,
        totalApiLogs,
        avgResponseTime: 45 // Placeholder ms
      },
      callsOverTime,
      planDistribution: formattedPlans
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/users
const getUsers = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: { role: 'CLIENT' },
      select: {
        id: true,
        email: true,
        plan: true,
        isActive: true,
        createdAt: true,
        _count: {
          select: { apiLogs: true, apiKeys: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return sendSuccess(res, users);
  } catch (err) {
    next(err);
  }
};

// PUT /admin/users/:id
const updateUser = async (req, res, next) => {
  try {
    const userId = parseInt(req.params.id);
    const { isActive, plan, customDailyLimit, customBurstLimit, isSuspended, autoSuspendEnabled } = req.body;

    const user = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(isActive !== undefined && { isActive }),
        ...(plan && { plan }),
        ...(customDailyLimit !== undefined && { customDailyLimit: customDailyLimit === '' ? null : parseInt(customDailyLimit) }),
        ...(customBurstLimit !== undefined && { customBurstLimit: customBurstLimit === '' ? null : parseInt(customBurstLimit) }),
        ...(isSuspended !== undefined && { isSuspended }),
        ...(autoSuspendEnabled !== undefined && { autoSuspendEnabled })
      }
    });

    return sendSuccess(res, user, 'User updated successfully');
  } catch (err) {
    next(err);
  }
};

// GET /admin/usage-alerts
const getUsageAlerts = async (req, res, next) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // In a real high-scale system, we'd query Redis for all users' daily counters.
    // Here we'll query ApiLog for today's summary per user.
    const usageData = await prisma.apiLog.groupBy({
      by: ['userId'],
      _count: { id: true },
      where: {
        createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) }
      }
    });

    // Fetch user details for these users
    const userIds = usageData.map(d => d.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, email: true, plan: true, customDailyLimit: true, isSuspended: true }
    });

    const PLAN_LIMITS_MAP = { FREE: 5000, PREMIUM: 50000, PRO: 300000, UNLIMITED: 1000000 };

    const alerts = usageData.map(usage => {
      const user = users.find(u => u.id === usage.userId);
      if (!user) return null;

      const limit = user.customDailyLimit || PLAN_LIMITS_MAP[user.plan] || 5000;
      const consumed = usage._count.id;
      const percent = (consumed / limit) * 100;

      return {
        userId: user.id,
        email: user.email,
        plan: user.plan,
        limit,
        consumed,
        percent: Math.round(percent),
        isSuspended: user.isSuspended
      };
    })
    .filter(a => a !== null && (a.percent >= 80 || a.isSuspended))
    .sort((a, b) => b.percent - a.percent);

    return sendSuccess(res, alerts);
  } catch (err) {
    next(err);
  }
};

// GET /admin/villages
const getVillages = async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const skip = (page - 1) * limit;

    const villages = await prisma.village.findMany({
      skip,
      take: limit,
      include: {
        subDistrict: {
          include: {
            district: {
              include: { state: true }
            }
          }
        }
      }
    });

    // Formatting for Data Table
    const formatted = villages.map(v => ({
      id: v.id,
      code: v.villageCode,
      name: v.name,
      subDistrict: v.subDistrict.name,
      district: v.subDistrict.district.name,
      state: v.subDistrict.district.state.name
    }));

    const total = await prisma.village.count();

    return res.json({
      success: true,
      data: formatted,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (err) {
    next(err);
  }
};

// GET /admin/logs
const getLogs = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 50;
    
    const logs = await prisma.apiLog.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { email: true } }
      }
    });

    const formatted = logs.map(l => ({
      id: l.id,
      timestamp: l.createdAt,
      user: l.user.email,
      endpoint: l.endpoint,
      method: l.method,
      status: l.statusCode,
      timeMs: l.responseTimeMs
    }));

    return sendSuccess(res, formatted);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStats,
  getUsers,
  updateUser,
  getUsageAlerts,
  getVillages,
  getLogs
};
