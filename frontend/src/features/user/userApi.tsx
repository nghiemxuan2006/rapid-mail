import { createAsyncThunk } from '@reduxjs/toolkit'
import { sendRequest } from '@/utils'

export const getUserProfile = createAsyncThunk(
    'user/getUserProfile',
    async (_, thunkApi) => {
        return sendRequest('/auth/profile', 'GET', {}, thunkApi)
    }
)

export const connectGmailAccount = createAsyncThunk(
    'user/connectGmail',
    async (authorizeCode: string, thunkApi) => {
        return sendRequest(`/auth/connect/gmail?authorize_code=${encodeURIComponent(authorizeCode)}`, 'GET', {}, thunkApi)
    }
)

export const connectOutlookAccount = createAsyncThunk(
    'user/connectOutlook',
    async (authorizeCode: string, thunkApi) => {
        return sendRequest(`/auth/connect/outlook`, 'POST', { authorize_code: authorizeCode }, thunkApi)
    }
)

export const disconnectAccount = createAsyncThunk(
    'user/disconnectAccount',
    async (accountId: string, thunkApi) => {
        return sendRequest(`/auth/connected-accounts/${accountId}`, 'DELETE', {}, thunkApi)
    }
)

export const activateAccount = createAsyncThunk(
    'user/activateAccount',
    async (accountId: string, thunkApi) => {
        return sendRequest(`/auth/connected-accounts/${accountId}/activate`, 'PUT', {}, thunkApi)
    }
)
