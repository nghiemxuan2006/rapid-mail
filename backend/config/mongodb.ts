import mongoose from 'mongoose';
import logger from '../utils/wiston-log';
import settings from './env';

const connectMongoDB = async (): Promise<void> => {
    try {
        const mongoURI = settings.MONGODB_URI || 'mongodb://localhost:27017/dating-app';

        await mongoose.connect(mongoURI);

        logger.info('Connected to MongoDB successfully');

        // Handle connection events
        mongoose.connection.on('error', (error) => {
            logger.error('MongoDB connection error:', error);
        });

        mongoose.connection.on('disconnected', () => {
            logger.warn('MongoDB disconnected');
        });

        // Handle application termination
        process.on('SIGINT', async () => {
            try {
                await mongoose.connection.close();
                logger.info('MongoDB connection closed through app termination');
                process.exit(0);
            } catch (error) {
                logger.error('Error closing MongoDB connection:', error);
                process.exit(1);
            }
        });

    } catch (error) {
        logger.error('Failed to connect to MongoDB:', error);
        process.exit(1);
    }
};

export default connectMongoDB;
