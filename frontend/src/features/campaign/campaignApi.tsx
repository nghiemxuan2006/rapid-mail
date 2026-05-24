import type { Campaign, CampaignCreateInput, CampaignUpdateInput, SendMode } from "@/schema/campaign"
import { sendRequest } from "@/utils"
import { createAsyncThunk } from "@reduxjs/toolkit"

function buildCampaignFormData(payload: CampaignCreateInput | CampaignUpdateInput): FormData {
    const formData = new FormData()
    formData.append('name', payload.name)
    formData.append('subject', payload.subject)
    formData.append('content', payload.content)
    formData.append('recipients', JSON.stringify(payload.recipients))
    if (payload.files) {
        payload.files.forEach((file) => formData.append('attachments', file))
    }
    if ('removeAttachments' in payload && payload.removeAttachments) {
        payload.removeAttachments.forEach((storedName) => formData.append('removeAttachments', storedName))
    }
    return formData
}

export const getCampaignsApi = createAsyncThunk<Campaign[], void>(
    'api/get-campaigns',
    async (payload, thunkApi) => {
        const res = await sendRequest('campaigns', 'GET', payload, thunkApi)
        return res.data
    }
)

export const createCampaignApi = createAsyncThunk<Campaign, CampaignCreateInput>(
    'api/create-campaign',
    async (payload, thunkApi) => {
        const formData = buildCampaignFormData(payload)
        const res = await sendRequest('campaigns', 'POST', formData, thunkApi, { 'Content-Type': 'multipart/form-data' })
        return res.data
    }
)

export const getCampaignByIdApi = createAsyncThunk<Campaign, { id: string }>(
    'api/get-campaign-by-id',
    async (payload, thunkApi) => {
        const res = await sendRequest(`campaigns/${payload.id}`, 'GET', null, thunkApi)
        return res.data
    }
)
export const deleteCampaignByIdApi = createAsyncThunk<void, { id: string }>(
    'api/delete-campaign-by-id',
    async (payload, thunkApi) => {
        const res = await sendRequest(`campaigns/${payload.id}`, 'DELETE', null, thunkApi)
        return res.data
    }
)

export const updateCampaignApi = createAsyncThunk<Campaign, CampaignUpdateInput>(
    'api/update-campaign',
    async (payload, thunkApi) => {
        const formData = buildCampaignFormData(payload)
        const res = await sendRequest(`campaigns/${payload._id}`, 'PUT', formData, thunkApi, { 'Content-Type': 'multipart/form-data' })
        return res.data
    }
)

type SendCampaignInput =
    | { id: string; sendMode: 'now' }
    | { id: string; sendMode: 'schedule_all'; scheduledAt: string }
    | { id: string; sendMode: 'schedule_individual'; scheduledTimes: Record<string, string> }

export const sendCampaignApi = createAsyncThunk<{ message: string; jobCount: number }, SendCampaignInput>(
    'api/send-campaign',
    async (payload, thunkApi) => {
        const { id, ...body } = payload
        const res = await sendRequest(`campaigns/${id}/send`, 'POST', body, thunkApi)
        return res.data
    }
)

export const cancelCampaignApi = createAsyncThunk<{ message: string; cancelledCount: number }, { id: string }>(
    'api/cancel-campaign',
    async (payload, thunkApi) => {
        const res = await sendRequest(`campaigns/${payload.id}/cancel`, 'POST', null, thunkApi)
        return res.data
    }
)

export interface CampaignStatusResponse {
    status: string;
    sendMode: SendMode | null;
    summary: { total: number; sent: number; failed: number; pending: number; cancelled: number };
}

export const getCampaignStatusApi = createAsyncThunk<CampaignStatusResponse, { id: string }>(
    'api/get-campaign-status',
    async (payload, thunkApi) => {
        const res = await sendRequest(`campaigns/${payload.id}/status`, 'GET', null, thunkApi)
        return res.data
    }
)