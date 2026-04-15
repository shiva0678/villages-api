// ─── Geo Data Controller ──────────────────────────────────────────────────────
// Handles all geographic data endpoints (Section 6.4)
// Endpoints: /states, /states/:id/districts, /districts/:id/subdistricts,
//            /subdistricts/:id/villages, /search, /autocomplete

const prisma          = require('../config/db');
const { redis, TTL }  = require('../config/redis');
const { sendSuccess, sendError } = require('../utils/response');

// ─── Helper: format village for dropdown (Section 6.5) ───────────────────────
const formatVillage = (v) => ({
  value: `village_id_${v.villageCode}`,
  label: v.name,
  fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, India`,
  hierarchy: {
    village:     v.name,
    subDistrict: v.subDistrict.name,
    district:    v.subDistrict.district.name,
    state:       v.subDistrict.district.state.name,
    country:     'India',
  },
});

// ─── GET /states ─────────────────────────────────────────────────────────────
const getStates = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const cacheKey  = 'geo:states:all';

    // Cache check (Fail-soft)
    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return sendSuccess(res, JSON.parse(cached), { startTime, rateLimit: req.rateLimit });
      }
    } catch (e) {
      console.warn('Redis read error (getStates):', e.message);
    }

    const states = await prisma.state.findMany({
      select: { id: true, stateCode: true, name: true },
      orderBy: { name: 'asc' },
    });

    try {
      await redis.setex(cacheKey, TTL.STATES, JSON.stringify(states));
    } catch (e) {
      console.warn('Redis write error (getStates):', e.message);
    }
    return sendSuccess(res, states, { startTime, rateLimit: req.rateLimit });
  } catch (err) { next(err); }
};

// ─── GET /states/:id/districts ───────────────────────────────────────────────
const getDistricts = async (req, res, next) => {
  try {
    const startTime  = Date.now();
    const { id }     = req.params;
    const cacheKey   = `geo:districts:state:${id}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return sendSuccess(res, JSON.parse(cached), { startTime, rateLimit: req.rateLimit });
      }
    } catch (e) {
      console.warn('Redis read error (getDistricts):', e.message);
    }

    const districts = await prisma.district.findMany({
      where: { stateId: parseInt(id) },
      select: { id: true, districtCode: true, name: true },
      orderBy: { name: 'asc' },
    });

    if (!districts.length) {
      return sendError(res, 404, 'NOT_FOUND', `No districts found for state id ${id}`);
    }

    try {
      await redis.setex(cacheKey, TTL.DISTRICTS, JSON.stringify(districts));
    } catch (e) {
      console.warn('Redis write error (getDistricts):', e.message);
    }
    return sendSuccess(res, districts, { startTime, rateLimit: req.rateLimit });
  } catch (err) { next(err); }
};

// ─── GET /districts/:id/subdistricts ─────────────────────────────────────────
const getSubDistricts = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { id }    = req.params;
    const cacheKey  = `geo:subdistricts:district:${id}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return sendSuccess(res, JSON.parse(cached), { startTime, rateLimit: req.rateLimit });
      }
    } catch (e) {
      console.warn('Redis read error (getSubDistricts):', e.message);
    }

    const subDistricts = await prisma.subDistrict.findMany({
      where: { districtId: parseInt(id) },
      select: { id: true, subDistrictCode: true, name: true },
      orderBy: { name: 'asc' },
    });

    if (!subDistricts.length) {
      return sendError(res, 404, 'NOT_FOUND', `No sub-districts found for district id ${id}`);
    }

    try {
      await redis.setex(cacheKey, TTL.SUBDISTRICTS, JSON.stringify(subDistricts));
    } catch (e) {
      console.warn('Redis write error (getSubDistricts):', e.message);
    }
    return sendSuccess(res, subDistricts, { startTime, rateLimit: req.rateLimit });
  } catch (err) { next(err); }
};

// ─── GET /subdistricts/:id/villages ──────────────────────────────────────────
const getVillages = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { id }    = req.params;
    const page      = parseInt(req.query.page) || 1;
    const limit     = Math.min(parseInt(req.query.limit) || 100, 500); // max 500
    const skip      = (page - 1) * limit;
    const cacheKey  = `geo:villages:subdistrict:${id}:p${page}:l${limit}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return sendSuccess(res, JSON.parse(cached), { startTime, rateLimit: req.rateLimit });
      }
    } catch (e) {
      console.warn('Redis read error (getVillages):', e.message);
    }

    const villages = await prisma.village.findMany({
      where: { subDistrictId: parseInt(id) },
      select: {
        id: true, villageCode: true, name: true,
        subDistrict: {
          select: {
            name: true,
            district: { select: { name: true, state: { select: { name: true } } } }
          }
        }
      },
      orderBy: { name: 'asc' },
      skip,
      take: limit,
    });

    if (!villages.length) {
      return sendError(res, 404, 'NOT_FOUND', `No villages found for sub-district id ${id}`);
    }

    const formatted = villages.map(formatVillage);
    try {
      await redis.setex(cacheKey, TTL.VILLAGES, JSON.stringify(formatted));
    } catch (e) {
      console.warn('Redis write error (getVillages):', e.message);
    }
    return sendSuccess(res, formatted, { startTime, rateLimit: req.rateLimit });
  } catch (err) { next(err); }
};

// ─── GET /search?q=...&state=...&district=...&limit=... ───────────────────────
const search = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { q, state, district, subDistrict, limit: lim } = req.query;

    if (!q || q.trim().length < 2) {
      return sendError(res, 400, 'INVALID_QUERY', 'Search query must be at least 2 characters');
    }

    const limit    = Math.min(parseInt(lim) || 25, 100);
    const cacheKey = `geo:search:${q}:${state||''}:${district||''}:${subDistrict||''}:${limit}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return sendSuccess(res, JSON.parse(cached), { startTime, rateLimit: req.rateLimit });
      }
    } catch (e) {
      console.warn('Redis read error (search):', e.message);
    }

    const whereClause = {
      name: { contains: q.trim(), mode: 'insensitive' },
      ...(subDistrict && {
        subDistrict: { name: { contains: subDistrict, mode: 'insensitive' } }
      }),
      ...(district && {
        subDistrict: {
          district: { name: { contains: district, mode: 'insensitive' } }
        }
      }),
      ...(state && {
        subDistrict: {
          district: { state: { name: { contains: state, mode: 'insensitive' } } }
        }
      }),
    };

    const villages = await prisma.village.findMany({
      where: whereClause,
      take: limit,
      select: {
        id: true, villageCode: true, name: true,
        subDistrict: {
          select: {
            name: true,
            district: { select: { name: true, state: { select: { name: true } } } }
          }
        }
      },
      orderBy: { name: 'asc' },
    });

    const formatted = villages.map(formatVillage);
    try {
      await redis.setex(cacheKey, TTL.SEARCH, JSON.stringify(formatted));
    } catch (e) {
      console.warn('Redis write error (search):', e.message);
    }
    return sendSuccess(res, formatted, { startTime, rateLimit: req.rateLimit });
  } catch (err) { next(err); }
};

// ─── GET /autocomplete?q=...&hierarchyLevel=village|subdistrict|district|state
const autocomplete = async (req, res, next) => {
  try {
    const startTime = Date.now();
    const { q, hierarchyLevel = 'village' } = req.query;

    if (!q || q.trim().length < 2) {
      return sendError(res, 400, 'INVALID_QUERY', 'Query must be at least 2 characters');
    }

    const limit    = 10; // autocomplete always returns max 10
    const cacheKey = `geo:autocomplete:${hierarchyLevel}:${q}`;

    try {
      const cached = await redis.get(cacheKey);
      if (cached) {
        return sendSuccess(res, JSON.parse(cached), { startTime, rateLimit: req.rateLimit });
      }
    } catch (e) {
      console.warn('Redis read error (autocomplete):', e.message);
    }

    let results = [];
    const searchOpts = { contains: q.trim(), mode: 'insensitive' };

    if (hierarchyLevel === 'state') {
      results = await prisma.state.findMany({
        where: { name: searchOpts }, take: limit,
        select: { id: true, stateCode: true, name: true }
      });
    } else if (hierarchyLevel === 'district') {
      results = await prisma.district.findMany({
        where: { name: searchOpts }, take: limit,
        select: { id: true, districtCode: true, name: true, state: { select: { name: true } } }
      });
    } else if (hierarchyLevel === 'subdistrict') {
      results = await prisma.subDistrict.findMany({
        where: { name: searchOpts }, take: limit,
        select: { id: true, subDistrictCode: true, name: true, district: { select: { name: true, state: { select: { name: true } } } } }
      });
    } else {
      // Default: village
      const villages = await prisma.village.findMany({
        where: { name: searchOpts }, take: limit,
        select: {
          id: true, villageCode: true, name: true,
          subDistrict: { select: { name: true, district: { select: { name: true, state: { select: { name: true } } } } } }
        }
      });
      results = villages.map(formatVillage);
    }

    try {
      await redis.setex(cacheKey, TTL.SEARCH, JSON.stringify(results));
    } catch (e) {
      console.warn('Redis write error (autocomplete):', e.message);
    }
    return sendSuccess(res, results, { startTime, rateLimit: req.rateLimit });
  } catch (err) { next(err); }
};

module.exports = { getStates, getDistricts, getSubDistricts, getVillages, search, autocomplete };
