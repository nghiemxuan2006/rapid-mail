import { createAsyncThunk } from '@reduxjs/toolkit'
import { sendRequest } from '@/utils'
import type { ConnectedAccount } from '@/features/auth/authSlice'

export interface ConnectGmailResult {
    activeAccountId: string | null
    connectedAccounts: ConnectedAccount[]
    signatureImported?: boolean
}

export const getUserProfile = createAsyncThunk(
    'user/getUserProfile',
    async (_, thunkApi) => {
        const res = await sendRequest('/auth/profile', 'GET', {}, thunkApi)
        return res.data
    }
)

export const connectGmailAccount = createAsyncThunk<ConnectGmailResult, string>(
    'user/connectGmail',
    async (authorizeCode: string, thunkApi) => {
        const res = await sendRequest(`/auth/connect/gmail?authorize_code=${encodeURIComponent(authorizeCode)}`, 'GET', {}, thunkApi)
        return res.data
    }
)

export const connectOutlookAccount = createAsyncThunk(
    'user/connectOutlook',
    async (authorizeCode: string, thunkApi) => {
        const res = await sendRequest(`/auth/connect/outlook`, 'POST', { authorize_code: authorizeCode }, thunkApi)
        return res.data
    }
)

export const disconnectAccount = createAsyncThunk(
    'user/disconnectAccount',
    async (accountId: string, thunkApi) => {
        const res = await sendRequest(`/auth/connected-accounts/${accountId}`, 'DELETE', {}, thunkApi)
        return res.data
    }
)

export const activateAccount = createAsyncThunk(
    'user/activateAccount',
    async (accountId: string, thunkApi) => {
        const res = await sendRequest(`/auth/connected-accounts/${accountId}/activate`, 'PUT', {}, thunkApi)
        return res.data
    }
)
