import { Request, Response, NextFunction } from 'express';
import { getSignatureList } from '../services/signature.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';

export const getSignatures = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.sub as string | undefined;

        if (!userId) {
            throw new UNAUTHORIZED_ERROR('Missing user context');
        }

        const signatures = await getSignatureList(userId);

        res.json({
            message: 'Signatures retrieved successfully',
            data: signatures
        });
    } catch (error) {
        next(error);
    }
};
