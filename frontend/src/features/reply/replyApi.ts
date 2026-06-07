import { sendRequest } from "@/utils"

export type Reply = {
  _id: string;
  campaignId: { _id: string; name: string } | string;
  jobId: string;
  recipientEmail: string;
  threadId: string;
  replyMessageId: string;
  snippet: string;
  receivedAt: string;
  isRead: boolean;
};

export const fetchUnreadReplies = async (): Promise<Reply[]> => {
  const thunkApi = {
    rejectWithValue: (e: any) => {
      throw e
    }
  }

  const res = await sendRequest('replies', 'GET', { unread: true }, thunkApi)
  return res.data
}

export const markReplyRead = async (id: string): Promise<void> => {
  const thunkApi = {
    rejectWithValue: (e: any) => {
      throw e
    }
  }

  await sendRequest(`replies/${id}/read`, 'PATCH', null, thunkApi)
}
