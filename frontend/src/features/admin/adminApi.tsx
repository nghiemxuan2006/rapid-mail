import { createAsyncThunk } from '@reduxjs/toolkit'
import { sendRequest } from '@/utils'

export interface AdminUser {
    _id: string
    name: string
    email: string
    role: 'user' | 'admin'
    isActive: boolean
    createdAt: string
}

export interface AdminFeedback {
    _id: string
    type: 'bug' | 'feature' | 'general'
    title: string
    message: string
    status: 'pending' | 'in_progress' | 'resolved'
    createdAt: string
    user_id: { _id: string; name: string; email: string } | null
}

export const getUsersApi = createAsyncThunk<AdminUser[], { search?: string } | void>(
    'api/admin-get-users',
    async (payload, thunkApi) => {
        const search = payload?.search
        const query = search ? `?search=${encodeURIComponent(search)}` : ''
        const res = await sendRequest(`admin/users${query}`, 'GET', null, thunkApi)
        return res.data
    }
)

export const updateUserRoleApi = createAsyncThunk<AdminUser, { id: string; role: 'user' | 'admin' }>(
    'api/admin-update-user-role',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/users/${payload.id}/role`, 'PATCH', { role: payload.role }, thunkApi)
        return res.data
    }
)

export const updateUserActiveApi = createAsyncThunk<AdminUser, { id: string; isActive: boolean }>(
    'api/admin-update-user-active',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/users/${payload.id}/active`, 'PATCH', { isActive: payload.isActive }, thunkApi)
        return res.data
    }
)

export const deleteUserApi = createAsyncThunk<void, { id: string }>(
    'api/admin-delete-user',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/users/${payload.id}`, 'DELETE', null, thunkApi)
        return res.data
    }
)

export const getFeedbackApi = createAsyncThunk<AdminFeedback[], { type?: string; status?: string } | void>(
    'api/admin-get-feedback',
    async (payload, thunkApi) => {
        const params = new URLSearchParams()
        if (payload?.type) params.set('type', payload.type)
        if (payload?.status) params.set('status', payload.status)
        const query = params.toString() ? `?${params.toString()}` : ''
        const res = await sendRequest(`admin/feedback${query}`, 'GET', null, thunkApi)
        return res.data
    }
)

export const updateFeedbackStatusApi = createAsyncThunk<AdminFeedback, { id: string; status: 'pending' | 'in_progress' | 'resolved' }>(
    'api/admin-update-feedback-status',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/feedback/${payload.id}/status`, 'PATCH', { status: payload.status }, thunkApi)
        return res.data
    }
)

export const deleteFeedbackApi = createAsyncThunk<void, { id: string }>(
    'api/admin-delete-feedback',
    async (payload, thunkApi) => {
        const res = await sendRequest(`admin/feedback/${payload.id}`, 'DELETE', null, thunkApi)
        return res.data
    }
)
