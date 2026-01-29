import { z } from 'zod';

export const updateSignatureSchema = z.object({
    body: z.object({
        sendAsEmail: z.string().email('Invalid email address'),
        signature: z.string().min(1, 'Signature cannot be empty')
    })
});

export type UpdateSignatureInput = z.infer<typeof updateSignatureSchema>['body'];
