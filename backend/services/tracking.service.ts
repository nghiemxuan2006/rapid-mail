import settings from '../config/env';
import logger from '../utils/wiston-log';
import { markEmailJobOpened } from '../repositories/campaign.repository';
import { createTrackingToken, verifyTrackingToken } from '../utils/tracking-token';

// GIF trong suốt 1x1 — nội dung trả về cho mọi request tracking pixel.
export const TRACKING_PIXEL_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64',
);

export const buildTrackingPixelUrl = (campaignId: string, jobId: string): string | null => {
  if (!settings.TRACKING_BASE_URL) return null;
  const base = settings.TRACKING_BASE_URL.replace(/\/+$/, '');
  return `${base}/v1/t/open/${createTrackingToken(campaignId, jobId)}`;
};

export const buildTrackingPixelHtml = (campaignId: string, jobId: string): string => {
  const url = buildTrackingPixelUrl(campaignId, jobId);
  if (!url) return '';
  return `<img src="${url}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0" />`;
};

// Ghi nhận một lần mở mail. Token sai/giả mạo được bỏ qua im lặng: controller vẫn
// trả pixel 200 để không tiết lộ token nào hợp lệ và không làm hỏng hiển thị mail.
export const recordEmailOpen = async (token: string): Promise<void> => {
  const payload = verifyTrackingToken(token);
  if (!payload) {
    logger.warn('Invalid tracking token received');
    return;
  }

  const isFirstOpen = await markEmailJobOpened(payload.campaignId, payload.jobId);
  if (isFirstOpen) {
    logger.info('Email open recorded', payload);
  }
};
