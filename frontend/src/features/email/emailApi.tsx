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
    content: string,
    subject: string,
    attachments?: File[]
}

export const sendMultipleEmailsApi = createAsyncThunk<void, sendMultipleEmailsRequestType>(
    'api/sendMultipleEmails',
    async (payload, thunkApi) => {
        const formData = new FormData()
        formData.append('recipients', JSON.stringify(payload.recipients))
        formData.append('content', payload.content)
        formData.append('subject', payload.subject)
        if (payload.attachments) {
            payload.attachments.forEach((file) => {
                formData.append('attachments', file)
            })
        }
        const res = await sendRequest('email/multiple', 'POST', formData, thunkApi, { 'Content-Type': 'multipart/form-data' })
        return res
    }
)