import Feedback, { FeedbackDocument } from '../models/feedback.model';

export const createFeedback = (doc: {
  user_id: string;
  type: string;
  title: string;
  message: string;
}) => Feedback.create(doc);

export const findFeedbackByUserId = (userId: string) =>
  Feedback.find({ user_id: userId }).sort({ createdAt: -1 });

export const findAllFeedback = (filter: { type?: string; status?: string }) => {
  const query: Record<string, string> = {};
  if (filter.type) query.type = filter.type;
  if (filter.status) query.status = filter.status;

  return Feedback.find(query).sort({ createdAt: -1 }).populate('user_id', 'name email');
};

export const findFeedbackById = (id: string) => Feedback.findById(id);

export const updateFeedbackStatusById = (id: string, status: string) =>
  Feedback.findByIdAndUpdate(id, { status }, { new: true });

export const deleteFeedbackById = (id: string): Promise<FeedbackDocument | null> =>
  Feedback.findByIdAndDelete(id);
