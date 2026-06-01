import { createSlice } from '@reduxjs/toolkit';
import type { Campaign } from '@/schema/campaign';
import { getCampaignsApi, getCampaignByIdApi } from './campaignApi';

interface CampaignState {
    list: Campaign[];
    loaded: boolean;
}

const initialState: CampaignState = {
    list: [],
    loaded: false,
};

const campaignSlice = createSlice({
    name: 'campaign',
    initialState,
    reducers: {
        addCampaign(state, action: { payload: Campaign }) {
            state.list.unshift(action.payload);
        },
        updateCampaign(state, action: { payload: Campaign }) {
            const idx = state.list.findIndex(c => c._id === action.payload._id);
            if (idx !== -1) state.list[idx] = action.payload;
        },
        updateCampaignStatus(state, action: { payload: { _id: string; status: string } }) {
            const idx = state.list.findIndex(c => c._id === action.payload._id);
            if (idx !== -1) state.list[idx] = { ...state.list[idx], status: action.payload.status };
        },
        removeCampaign(state, action: { payload: string }) {
            state.list = state.list.filter(c => c._id !== action.payload);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(getCampaignsApi.fulfilled, (state, action) => {
            state.list = action.payload.map((incoming) => {
                const existing = state.list.find((c) => c._id === incoming._id);
                return existing?.email_jobs
                    ? { ...incoming, email_jobs: existing.email_jobs }
                    : incoming;
            });
            state.loaded = true;
        });
        builder.addCase(getCampaignByIdApi.fulfilled, (state, action) => {
            const idx = state.list.findIndex((c) => c._id === action.payload._id);
            if (idx !== -1) state.list[idx] = action.payload;
        });
    },
});

export const { addCampaign, updateCampaign, updateCampaignStatus, removeCampaign } = campaignSlice.actions;
export default campaignSlice.reducer;
