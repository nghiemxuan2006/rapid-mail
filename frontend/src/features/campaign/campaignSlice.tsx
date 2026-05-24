import { createSlice } from '@reduxjs/toolkit';
import type { Campaign } from '@/schema/campaign';
import { getCampaignsApi } from './campaignApi';

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
        removeCampaign(state, action: { payload: string }) {
            state.list = state.list.filter(c => c._id !== action.payload);
        },
    },
    extraReducers: (builder) => {
        builder.addCase(getCampaignsApi.fulfilled, (state, action) => {
            state.list = action.payload;
            state.loaded = true;
        });
    },
});

export const { addCampaign, updateCampaign, removeCampaign } = campaignSlice.actions;
export default campaignSlice.reducer;
