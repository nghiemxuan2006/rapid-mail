import { Request, Response, NextFunction } from 'express';
import { sendMultipleEmails, Attachment } from '../services/email.service';
import { UNAUTHORIZED_ERROR } from '../utils/error';
import { MultipleEmailsBody } from '../schema/email.schema';

export const submitMultipleEmails = async (
  req: Request<{}, {}, MultipleEmailsBody>,
  res: Response,
  next: NextFunction
) => {
  try {
    const { content, recipients, subject } = req.body;
    const userId = req.user?.sub as string | undefined;
    if (!userId) {
      throw new UNAUTHORIZED_ERROR('Missing user context');
    }

    const files = req.files as Express.Multer.File[] | undefined;
    const attachments: Attachment[] | undefined = files?.map((file) => ({
      filename: file.originalname,
      mimeType: file.mimetype,
      content: file.buffer,
    }));

    await sendMultipleEmails({ content, recipients, userId, subject, attachments });

    res.json({
      message: 'All emails accepted',
    });
  } catch (error) {
    next(error);
  }
};
