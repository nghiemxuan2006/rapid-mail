import type { Recipient } from "@/schema/campaign";
import { sendRequest } from "@/utils";
import { createAsyncThunk } from "@reduxjs/toolkit";

interface SendEmailRequestType {
    recipients: Array<string>,
    content: string
}
export const sendMailApi = createAsyncThunk<void, SendEmailRequestType>(
    'api/sendEmail',
    async (payload, thunkApi) => {
        const res = await sendRequest('email', 'POST', payload, thunkApi)
        return res
    }
)

interface sendMultipleEmailsRequestType {
    recipients: Array<Recipient>,
    content: string
}

export const sendMultipleEmailsApi = createAsyncThunk<void, sendMultipleEmailsRequestType>(
    'api/sendMultipleEmails',
    async (payload, thunkApi) => {
        const res = await sendRequest('email/multiple', 'POST', payload, thunkApi)
        return res
    }
)