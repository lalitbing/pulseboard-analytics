import { Request, Response } from 'express';
import { ingestEvent } from '../services/ingest.service';

export const trackEvent = async (req: any, res: any) => {
  console.log('TRACK CONTROLLER HIT');
  console.log('REQ.PROJECT =', req.project);

  if (!req.project) {
    return res.status(500).json({
      error: 'Project not attached. Middleware failure.',
    });
  }

  await ingestEvent({
    ...req.body,
    projectId: req.project.id,
  });

  res.json({ success: true });
};
