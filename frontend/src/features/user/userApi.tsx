import { createAsyncThunk } from '@reduxjs/toolkit'
import { sendRequest } from '@/utils'

export const getUserProfile = createAsyncThunk(
    'user/getUserProfile',
    async (_, thunkApi) => {
        return sendRequest('/auth/profile', 'GET', {}, thunkApi)
    }
)
