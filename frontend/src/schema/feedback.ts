import * as yup from 'yup';

export type FeedbackType = 'bug' | 'feature' | 'general';

export interface FeedbackCreateInput {
  type: FeedbackType;
  title: string;
  message: string;
}

export const feedbackFormSchema: yup.ObjectSchema<FeedbackCreateInput> = yup.object({
  type: yup.mixed<FeedbackType>().oneOf(['bug', 'feature', 'general']).required('Please select a feedback type'),
  title: yup.string().trim().min(1, 'Title cannot be empty').max(100, 'Title must be at most 100 characters').required('Title cannot be empty'),
  message: yup.string().trim().min(1, 'Message cannot be empty').max(2000, 'Message must be at most 2000 characters').required('Message cannot be empty'),
});
