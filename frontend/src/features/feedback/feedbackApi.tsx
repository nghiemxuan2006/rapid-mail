import { createAsyncThunk } from '@reduxjs/toolkit'
import { sendRequest } from '@/utils'
import type { FeedbackCreateInput } from '@/schema/feedback'

export interface Feedback {
    _id: string
    type: 'bug' | 'feature' | 'general'
    title: string
    message: string
    status: 'pending' | 'in_progress' | 'resolved'
    createdAt: string
}

export const createFeedbackApi = createAsyncThunk<Feedback, FeedbackCreateInput>(
    'api/create-feedback',
    async (payload, thunkApi) => {
        const res = await sendRequest('feedback', 'POST', payload, thunkApi)
        return res.data
    }
)
