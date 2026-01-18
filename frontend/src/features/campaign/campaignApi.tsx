import type { Campaign, CampaignCreateInput } from "@/schema/campaign"
import { sendRequest } from "@/utils"
import { createAsyncThunk } from "@reduxjs/toolkit"

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
        const res = await sendRequest('campaigns', 'POST', payload, thunkApi)
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

export const updateCampaignApi = createAsyncThunk<Campaign, Campaign>(
    'api/update-campaign',
    async (payload, thunkApi) => {
        const res = await sendRequest(`campaigns/${payload._id}`, 'PUT', payload, thunkApi)
        return res.data
    }
)