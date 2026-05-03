const settings = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app',
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'your_jwt_secret',
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || '',
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || '',
    GOOGLE_REDIRECT_URI: process.env.GOOGLE_REDIRECT_URI || '',
    MICROSOFT_CLIENT_ID: process.env.MICROSOFT_CLIENT_ID || '',
    MICROSOFT_CLIENT_SECRET: process.env.MICROSOFT_CLIENT_SECRET || '',
    MICROSOFT_REDIRECT_URI: process.env.MICROSOFT_REDIRECT_URI || 'http://localhost:5173/auth/callback',
    ACCESS_TOKEN_EXPIRES_IN: process.env.ACCESS_TOKEN_EXPIRES_IN || '15m',
    REFRESH_TOKEN_EXPIRES_IN: process.env.REFRESH_TOKEN_EXPIRES_IN || '30d',
    FILE_STORAGE_PATH: process.env.FILE_STORAGE_PATH,
}

export default settings;