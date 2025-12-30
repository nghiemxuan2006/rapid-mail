const settings = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 3000,
    MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/dating-app',
    JWT_SECRET_KEY: process.env.JWT_SECRET_KEY || 'your_jwt_secret'
}

export default settings;