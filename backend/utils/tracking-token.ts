import crypto from 'crypto';
import settings from '../config/env';

// Token gắn vào tracking pixel của mỗi email job.
//
// Dạng: base64url(campaignId:jobId).signature — stateless, không cần bảng mapping.
// Chữ ký HMAC-SHA256 bằng TRACKING_SECRET đảm bảo người nhận không thể sửa token
// để tăng số liệu của campaign khác. Token nằm trong URL công khai nên nó KHÔNG bí mật:
// chỉ dùng để định danh job, không bao giờ dùng thay cho xác thực người dùng.

const SEPARATOR = '.';

const sign = (payload: string): string =>
  crypto.createHmac('sha256', settings.TRACKING_SECRET).update(payload).digest('base64url');

export const createTrackingToken = (campaignId: string, jobId: string): string => {
  const payload = Buffer.from(`${campaignId}:${jobId}`).toString('base64url');
  return `${payload}${SEPARATOR}${sign(payload)}`;
};

export type TrackingTokenPayload = {
  campaignId: string;
  jobId: string;
};

// Trả về null cho mọi token sai định dạng hoặc sai chữ ký — caller vẫn phải trả pixel
// bình thường, không được lộ ra token hợp lệ hay không.
export const verifyTrackingToken = (token: string): TrackingTokenPayload | null => {
  if (typeof token !== 'string') return null;

  const parts = token.split(SEPARATOR);
  if (parts.length !== 2) return null;

  const [payload, signature] = parts as [string, string];
  if (!payload || !signature) return null;

  const expected = sign(payload);
  const given = Buffer.from(signature);
  const want = Buffer.from(expected);
  // So sánh timing-safe; độ dài khác nhau thì timingSafeEqual sẽ throw nên chặn trước.
  if (given.length !== want.length || !crypto.timingSafeEqual(given, want)) return null;

  const decoded = Buffer.from(payload, 'base64url').toString('utf8');
  const idx = decoded.indexOf(':');
  if (idx <= 0) return null;

  const campaignId = decoded.slice(0, idx);
  const jobId = decoded.slice(idx + 1);
  if (!campaignId || !jobId) return null;

  return { campaignId, jobId };
};
