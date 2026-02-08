import { Request, Response, NextFunction } from 'express';
import { getSignatureList, updateSignatureService } from '../services/signature.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import { updateSignatureSchema } from '../schema/signature.schema';
import User from '../models/user.model';

export const getSignatures = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const userId = req.user?.sub as string | undefined;

        if (!userId) {
            throw new UNAUTHORIZED_ERROR('Missing user context');
        }

        const user = await User.findById(userId);
        if (!user) {
            throw new UNAUTHORIZED_ERROR('User not found');
        }

        const signatures = await getSignatureList(user);

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
