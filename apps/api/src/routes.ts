import { Router } from 'express';
import { trackEvent } from './controllers/track.controller';
import { verifyApiKey } from './middlewares/apiKey.middleware';
import { validate } from './middlewares/validate.middleware';
import { trackSchema } from './validators/track.schema';
import { trackBatch } from './validators/trackBatch.controller';
import { getEventStats, getTopEvents } from './controllers/stats.controller';

const router = Router();

// router.post("/track", trackEvent)
// router.post("/track", verifyApiKey, trackEvent)
router.post('/track', verifyApiKey, validate(trackSchema), trackEvent);

router.post('/track/batch', verifyApiKey, trackBatch);

router.get("/stats/events", verifyApiKey, getEventStats)
router.get("/stats/top-events", verifyApiKey, getTopEvents)


export default router;
