import { Router } from 'express';
import { trackEvent } from './controllers/track.controller';
import { verifyApiKey } from './middlewares/apiKey.middleware';
import { validate } from './middlewares/validate.middleware';
import { trackSchema } from './validators/track.schema';
import { trackBatch } from './validators/trackBatch.controller';
import { getEventStats, getTopEvents } from './controllers/stats.controller';
import { getWorkerStatus } from './controllers/worker.controller';

const router = Router();

// router.post("/track", trackEvent)
// router.post("/track", verifyApiKey, trackEvent)
router.post('/track', verifyApiKey, validate(trackSchema), trackEvent);

router.post('/track/batch', verifyApiKey, trackBatch);

router.get('/stats/events', verifyApiKey, getEventStats);
router.get('/stats/top-events', verifyApiKey, getTopEvents);

// Get project info (for real-time WebSocket setup)
router.get('/project-info', verifyApiKey, (req: any, res: any) => {
  res.json({
    id: req.project.id,
    project_id: req.project.id,
    name: req.project.name || 'Default Project',
  });
});

router.get('/worker-status', verifyApiKey, getWorkerStatus);

export default router;
