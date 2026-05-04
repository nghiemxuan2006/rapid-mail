import { sendRequest } from "@/utils"
import { createAsyncThunk } from "@reduxjs/toolkit"

// Gmail sendAs shape (from import endpoints)
export interface GmailSignature {
    sendAsEmail: string,
    displayName: string,
    replyToAddress: string,
    signature: string,
    isPrimary: boolean,
    isDefault: boolean
}

// App-managed signature shape (MongoDB)
export interface Signature {
    _id: string
    name: string
    content: string
    sourceEmail?: string
    provider?: 'gmail' | 'outlook'
    isDefault: boolean
    createdAt: string
    updatedAt: string
}

// ─── Gmail import ─────────────────────────────────────────────────────────────

export const getSignaturesApi = createAsyncThunk<GmailSignature[], void>(
    'api/get-signatures',
    async (payload, thunkApi) => {
        const res = await sendRequest('signatures/import/gmail', 'GET', payload, thunkApi)
        return res.data ?? []
    }
)

export const getSignaturesByAccountApi = createAsyncThunk<GmailSignature[], string>(
    'api/get-signatures-by-account',
    async (accountId, thunkApi) => {
        const res = await sendRequest(`signatures/import/gmail/${accountId}`, 'GET', undefined, thunkApi)
        return res.data ?? []
    }
)

// ─── App-managed signatures CRUD ─────────────────────────────────────────────

export const listSignaturesApi = createAsyncThunk<Signature[], void>(
    'api/list-signatures',
    async (_, thunkApi) => {
        const res = await sendRequest('signatures/', 'GET', undefined, thunkApi)
        return res.data ?? []
    }
)

export const getDefaultSignatureApi = createAsyncThunk<Signature | null, string | undefined>(
    'api/get-default-signature',
    async (accountId, thunkApi) => {
        const query = accountId ? `?accountId=${accountId}` : ''
        const res = await sendRequest(`signatures/default${query}`, 'GET', undefined, thunkApi)
        return res.data ?? null
    }
)

export interface CreateSignaturePayload {
    name: string
    content?: string
    sourceEmail?: string
    provider?: 'gmail' | 'outlook'
    isDefault?: boolean
}

export const createSignatureApi = createAsyncThunk<Signature, CreateSignaturePayload>(
    'api/create-signature',
    async (payload, thunkApi) => {
        const res = await sendRequest('signatures/', 'POST', payload, thunkApi)
        return res.data
    }
)

export interface UpdateSignaturePayload {
    id: string
    name?: string
    content?: string
    isDefault?: boolean
}

export const updateSignatureApi = createAsyncThunk<Signature, UpdateSignaturePayload>(
    'api/update-signature',
    async ({ id, ...body }, thunkApi) => {
        const res = await sendRequest(`signatures/${id}`, 'PUT', body, thunkApi)
        return res.data
    }
)

export const deleteSignatureApi = createAsyncThunk<string, string>(
    'api/delete-signature',
    async (id, thunkApi) => {
        await sendRequest(`signatures/${id}`, 'DELETE', undefined, thunkApi)
        return id
    }
)

// ─── Legacy: update Gmail sendAs signature directly ───────────────────────────

export interface UpdateGmailSignaturePayload {
    sendAsEmail: string;
    signature: string;
}

export const updateGmailSignatureApi = createAsyncThunk<GmailSignature, UpdateGmailSignaturePayload>(
    'api/update-gmail-signature',
    async (payload, thunkApi) => {
        const res = await sendRequest(`signatures/`, 'PUT', payload, thunkApi)
        return res.data
    }
)
