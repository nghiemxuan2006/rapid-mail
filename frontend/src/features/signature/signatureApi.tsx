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
