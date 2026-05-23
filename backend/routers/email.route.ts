import express from 'express';

const router = express.Router();

// Deprecated: replaced by POST /v1/campaigns/:id/send
router.post('/multiple', (_req, res) => {
  res.status(410).json({
    message: 'This endpoint is deprecated. Use POST /v1/campaigns/:id/send instead.',
  });
});

export default router;
