import { Request, Response, NextFunction } from 'express';
import logger from '../utils/wiston-log';

// Error handling middleware
export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
    let statusCode = err.statusCode;
    let message = err.message;
    logger.error(`Error ${statusCode}: ${message}`, {
        statusCode,
        stack: err.stack,
        route: req.originalUrl,
        method: req.method,
        ip: req.ip,
        userAgent: req.get('User-Agent')
    });
    res.status(statusCode).json({
        message
    });
}
