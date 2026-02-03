import { Request, Response, NextFunction } from 'express';
import { getSignatureList, updateSignatureService } from '../services/signature.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import { updateSignatureSchema } from '../schema/signature.schema';

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

export const updateSignature = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.sub as string | undefined;

        if (!userId) {
            throw new UNAUTHORIZED_ERROR('Missing user context');
        }

        const { sendAsEmail, signature } = updateSignatureSchema.parse(req.body);

        const result = await updateSignatureService(userId, sendAsEmail, signature);

        res.json({
            message: 'Signature updated successfully',
            data: result
        });
    } catch (error) {
        next(error);
    }
};
