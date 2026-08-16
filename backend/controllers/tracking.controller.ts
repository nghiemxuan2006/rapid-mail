import { Request, Response } from 'express';
import logger from '../utils/wiston-log';
import { recordEmailOpen, TRACKING_PIXEL_GIF } from '../services/tracking.service';

// Endpoint public, được gọi từ mail client của người nhận.
// Nguyên tắc: LUÔN trả pixel 200, kể cả khi token sai hoặc DB lỗi — người nhận không
// được thấy ảnh vỡ, và response không được tiết lộ token nào hợp lệ. Vì vậy handler
// này không gọi next(error) như các controller khác.
export const trackEmailOpenHandler = async (
  req: Request<{ token: string }>,
  res: Response,
): Promise<void> => {
  try {
    await recordEmailOpen(req.params.token);
  } catch (error) {
    logger.error('Failed to record email open', { error });
  }

  res.set({
    'Content-Type': 'image/gif',
    'Content-Length': String(TRACKING_PIXEL_GIF.length),
    // Chặn cache để lần fetch sau vẫn tới được server (Gmail vẫn có proxy cache riêng).
    'Cache-Control': 'no-store, no-cache, must-revalidate, private',
    Pragma: 'no-cache',
    Expires: '0',
  });
  res.status(200).end(TRACKING_PIXEL_GIF);
};
