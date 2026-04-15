// ─── Geo Routes (Section 6.4) ─────────────────────────────────────────────────
// Base: /v1/
// All routes require API key authentication + rate limiting

const express     = require('express');
const router      = express.Router();
const geoCtrl     = require('../controllers/geo.controller');
const apiKeyAuth  = require('../middleware/apiKeyAuth');
const rateLimiter = require('../middleware/rateLimit');

// Apply auth + rate limiting to all geo routes
router.use(apiKeyAuth);
router.use(rateLimiter);

// GET /v1/states
router.get('/states', geoCtrl.getStates);

// GET /v1/states/:id/districts
router.get('/states/:id/districts', geoCtrl.getDistricts);

// GET /v1/districts/:id/subdistricts
router.get('/districts/:id/subdistricts', geoCtrl.getSubDistricts);

// GET /v1/subdistricts/:id/villages?page=1&limit=100
router.get('/subdistricts/:id/villages', geoCtrl.getVillages);

// GET /v1/search?q=lachen&state=Sikkim&limit=25
router.get('/search', geoCtrl.search);

// GET /v1/autocomplete?q=mah&hierarchyLevel=state
router.get('/autocomplete', geoCtrl.autocomplete);

module.exports = router;
