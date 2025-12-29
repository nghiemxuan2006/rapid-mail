import { createAsyncThunk } from "@reduxjs/toolkit";
import { sendRequest } from "../../utils";


interface authType {
    access_token: string,
    refresh_token: string,
    username: string,
    id: number,
    email: string,
}
interface LoginRequestType {
    username: string,
    password: string
}

export const loginRequest = createAsyncThunk<authType, LoginRequestType>(
    'api/login',
    async (payload, thunkApi) => {
        const res = await sendRequest('login', 'POST', payload, thunkApi)
        return res
    }
)