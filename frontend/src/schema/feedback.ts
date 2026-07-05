import * as yup from 'yup';

export type FeedbackType = 'bug' | 'feature' | 'general';

export interface FeedbackCreateInput {
  type: FeedbackType;
  title: string;
  message: string;
}

export const feedbackFormSchema: yup.ObjectSchema<FeedbackCreateInput> = yup.object({
  type: yup.mixed<FeedbackType>().oneOf(['bug', 'feature', 'general']).required('Vui lòng chọn loại feedback'),
  title: yup.string().trim().min(1, 'Tiêu đề không được để trống').max(100, 'Tiêu đề tối đa 100 ký tự').required('Tiêu đề không được để trống'),
  message: yup.string().trim().min(1, 'Nội dung không được để trống').max(2000, 'Nội dung tối đa 2000 ký tự').required('Nội dung không được để trống'),
});
