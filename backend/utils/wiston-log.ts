import { createLogger, transports, format } from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';
import settings from '../config/env';

// Define custom log format
const logFormat = format.printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}] : ${stack || message}`;
});

// creates a new Winston Logger
const logger = createLogger({
    level: 'info',
    format: format.combine(
        // format.colorize(),
        format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        format.errors({ stack: true }), // include stack traces
        logFormat
    ),
    transports: [
        new DailyRotateFile({ filename: './logs/web-server-%DATE%.log', level: 'debug', datePattern: 'yyyy-MM-DD' }),
    ],
    exitOnError: false
});

if (settings.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        level: 'debug',
        format: format.combine(
            format.colorize(),
            logFormat
        )
    }));
}
export default logger;