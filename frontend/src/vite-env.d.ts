/// <reference types="vite/client" />

declare namespace NodeJS {
    interface ProcessEnv {
        readonly VITE_GOOGLE_CLIENT_ID?: string
    }
}
