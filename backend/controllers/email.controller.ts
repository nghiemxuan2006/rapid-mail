import { Request, Response, NextFunction } from 'express';
import { sendEmail, sendMultipleEmails } from '../services/email.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import { MutipleEmailsPostRequestType } from '../schema/email.schema';

export const submitEmail = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { content, receivers } = req.body;
        const userId = req.user?.sub as string | undefined;

        if (!userId) {
            throw new UNAUTHORIZED_ERROR('Missing user context');
        }

        const result = await sendEmail({ content, receivers, userId });

        res.json({
            message: 'Email accepted',
            data: result
        });
    } catch (error) {
        next(error);
    }
};

export const submitMultipleEmails = async (req: Request<{}, {}, MutipleEmailsPostRequestType>, res: Response, next: NextFunction) => {
    try {
        const { content, receivers } = req.body;
        const userId = req.user?.sub as string | undefined;
        if (!userId) {
            throw new UNAUTHORIZED_ERROR('Missing user context');
        }
        await sendMultipleEmails({ content, receivers, userId });

        res.json({
            message: 'All emails accepted'
        });
    } catch (error) {
        next(error);
    }
}