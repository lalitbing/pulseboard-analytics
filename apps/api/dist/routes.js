"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const track_controller_1 = require("./controllers/track.controller");
const apiKey_middleware_1 = require("./middlewares/apiKey.middleware");
const validate_middleware_1 = require("./middlewares/validate.middleware");
const track_schema_1 = require("./validators/track.schema");
const trackBatch_controller_1 = require("./validators/trackBatch.controller");
const stats_controller_1 = require("./controllers/stats.controller");
const worker_controller_1 = require("./controllers/worker.controller");
const router = (0, express_1.Router)();
// router.post("/track", trackEvent)
// router.post("/track", verifyApiKey, trackEvent)
router.post('/track', apiKey_middleware_1.verifyApiKey, (0, validate_middleware_1.validate)(track_schema_1.trackSchema), track_controller_1.trackEvent);
router.post('/track/batch', apiKey_middleware_1.verifyApiKey, trackBatch_controller_1.trackBatch);
router.get('/stats/events', apiKey_middleware_1.verifyApiKey, stats_controller_1.getEventStats);
router.get('/stats/top-events', apiKey_middleware_1.verifyApiKey, stats_controller_1.getTopEvents);
// Get project info (for real-time WebSocket setup)
router.get('/project-info', apiKey_middleware_1.verifyApiKey, (req, res) => {
    res.json({
        id: req.project.id,
        project_id: req.project.id,
        name: req.project.name || 'Default Project',
    });
});
router.get('/worker-status', apiKey_middleware_1.verifyApiKey, worker_controller_1.getWorkerStatus);
exports.default = router;
