import { Request, Response, NextFunction } from 'express';
import { sendMultipleEmails } from '../services/email.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import { MutipleEmailsPostRequestType } from '../schema/email.schema';

export const submitMultipleEmails = async (req: Request<{}, {}, MutipleEmailsPostRequestType>, res: Response, next: NextFunction) => {
    try {
        const { content, recipients, subject } = req.body;
        const userId = req.user?.sub as string | undefined;
        if (!userId) {
            throw new UNAUTHORIZED_ERROR('Missing user context');
        }
        await sendMultipleEmails({ content, recipients, userId, subject });

        res.json({
            message: 'All emails accepted'
        });
    } catch (error) {
        next(error);
    }
}