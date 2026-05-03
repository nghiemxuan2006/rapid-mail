import { sendRequest } from "@/utils"
import { createAsyncThunk } from "@reduxjs/toolkit"

export interface Signature {
    sendAsEmail: string,
    displayName: string,
    replyToAddress: string,
    signature: string,
    isPrimary: boolean,
    isDefault: boolean
}

export const getSignaturesApi = createAsyncThunk<Signature[], void>(
    'api/get-signatures',
    async (payload, thunkApi) => {
        const res = await sendRequest('signatures/', 'GET', payload, thunkApi)
        return res.data.sendAs
    }
)

export interface UpdateSignaturePayload {
    sendAsEmail: string;
    signature: string;
}

export const updateSignatureApi = createAsyncThunk<Signature, UpdateSignaturePayload>(
    'api/update-signature',
    async (payload, thunkApi) => {
        const res = await sendRequest(`signatures/`, 'PUT', payload, thunkApi)
        return res.data
    }
)
