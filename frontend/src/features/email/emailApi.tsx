import { sendRequest } from "@/utils";
import { createAsyncThunk } from "@reduxjs/toolkit";

interface SendEmailRequestType {
    receivers: Array<string>,
    content: string
}
export const sendMailApi = createAsyncThunk<void, SendEmailRequestType>(
    'api/sendEmail',
    async (payload, thunkApi) => {
        const res = await sendRequest('email', 'POST', payload, thunkApi)
        return res
    }
)