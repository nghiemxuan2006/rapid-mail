import type { Recipient } from "@/pages/email-template/EmailTemplate";
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

interface sendMultipleEmailsRequestType {
    receivers: Array<Recipient>,
    content: string
}

export const sendMultipleEmailsApi = createAsyncThunk<void, sendMultipleEmailsRequestType>(
    'api/sendMultipleEmails',
    async (payload, thunkApi) => {
        const res = await sendRequest('email/multiple', 'POST', payload, thunkApi)
        return res
    }
)