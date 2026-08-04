import Campaign, { CampaignDocument } from '../models/campaign.model';

export const findCampaignById = (id: string): Promise<CampaignDocument | null> =>
  Campaign.findById(id);

export const findCampaignsByUserId = (userId: string): Promise<CampaignDocument[]> =>
  Campaign.find({ user_id: userId })
    .select('name status recipients createdAt sentCount repliedCount')
    .sort({ createdAt: -1 });

export const findCampaignsByUserIdFull = (userId: string): Promise<CampaignDocument[]> =>
  Campaign.find({ user_id: userId });

export const updateCampaignById = (
  id: string,
  update: Record<string, unknown>,
): Promise<CampaignDocument | null> => Campaign.findByIdAndUpdate(id, update, { new: true });

export const deleteCampaignById = (id: string): Promise<CampaignDocument | null> =>
  Campaign.findByIdAndDelete(id);

export const saveCampaign = (campaign: CampaignDocument): Promise<CampaignDocument> =>
  campaign.save();

const buildJobSetFields = (
  jobId: string,
  update: Record<string, unknown>,
): Record<string, unknown> => {
  const setFields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(update)) {
    setFields[`email_jobs.${jobId}.${key}`] = value;
  }
  setFields[`email_jobs.${jobId}.updatedAt`] = new Date();
  return setFields;
};

// Cập nhật field của một email job, không đụng tới counter.
export const updateEmailJob = async (
  campaignId: string,
  jobId: string,
  update: Record<string, unknown>,
): Promise<void> => {
  await Campaign.updateOne(
    { _id: campaignId, [`email_jobs.${jobId}`]: { $exists: true } },
    { $set: buildJobSetFields(jobId, update) },
  );
};

// Đánh dấu job đã gửi và tăng sentCount đúng một lần.
// RabbitMQ giao message theo cơ chế at-least-once nên hàm này phải idempotent:
// filter loại sẵn job đã ở trạng thái 'sent', và vì filter + $inc nằm trong cùng
// một document update nên MongoDB đảm bảo atomic. Hàm tự ghi status: 'sent' vào
// $set (không phụ thuộc caller truyền field này trong `update`), để invariant mà
// filter kiểm tra luôn đúng — tránh trường hợp caller quên truyền status khiến
// mọi lần redeliver đều tăng sentCount.
//
// Giá trị trả về: `true` nghĩa là lần gọi này đã tăng sentCount; `false` nghĩa là
// job đã ở trạng thái 'sent' từ trước (redelivery vô hại), HOẶC campaign/job đó
// không tồn tại (dấu hiệu message trong queue bị sai).
export const markEmailJobSent = async (
  campaignId: string,
  jobId: string,
  update: Record<string, unknown>,
): Promise<boolean> => {
  const jobPath = `email_jobs.${jobId}`;
  const setFields = buildJobSetFields(jobId, update);

  const res = await Campaign.updateOne(
    {
      _id: campaignId,
      [jobPath]: { $exists: true },
      [`${jobPath}.status`]: { $ne: 'sent' },
    },
    { $set: { ...setFields, [`${jobPath}.status`]: 'sent' }, $inc: { sentCount: 1 } },
  );

  if (res.matchedCount > 0) return true;

  // Job đã 'sent' từ trước (message bị giao lại) — chỉ ghi lại metadata, không tăng số.
  await updateEmailJob(campaignId, jobId, update);
  return false;
};

// Đánh dấu job thất bại vĩnh viễn. Filter loại sẵn job đã 'sent': một job đã gửi
// thành công (và đã được tính vào sentCount) không bao giờ được phép lùi về 'failed',
// nếu không script backfill sẽ recompute sentCount xuống sai.
// Trả về true nếu job thực sự được chuyển sang 'failed'.
export const markEmailJobFailed = async (
  campaignId: string,
  jobId: string,
  update: Record<string, unknown>,
): Promise<boolean> => {
  const jobPath = `email_jobs.${jobId}`;

  const res = await Campaign.updateOne(
    {
      _id: campaignId,
      [jobPath]: { $exists: true },
      [`${jobPath}.status`]: { $ne: 'sent' },
    },
    { $set: { ...buildJobSetFields(jobId, update), [`${jobPath}.status`]: 'failed' } },
  );

  return res.matchedCount > 0;
};

// Đánh dấu recipient của job đã reply và tăng repliedCount đúng một lần.
// Một job ứng với đúng một recipient, nên cờ hasReplied cho ra ngữ nghĩa
// "số user duy nhất đã reply" mà không cần đếm distinct.
export const markEmailJobReplied = async (
  campaignId: string,
  jobId: string,
): Promise<boolean> => {
  const jobPath = `email_jobs.${jobId}`;

  const res = await Campaign.updateOne(
    {
      _id: campaignId,
      [jobPath]: { $exists: true },
      [`${jobPath}.hasReplied`]: { $ne: true },
    },
    {
      $set: { [`${jobPath}.hasReplied`]: true },
      $inc: { repliedCount: 1 },
    },
  );

  return res.matchedCount > 0;
};
