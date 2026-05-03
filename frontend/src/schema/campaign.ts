import * as yup from 'yup';

export interface Recipient {
    id: string;
    Email: string;
    [key: string]: string;
}
export interface Attachment {
    filename: string;
    storedName: string;
    mimeType: string;
    size: number;
}

export interface Campaign {
    _id: string;
    name: string;
    subject: string;
    content: string;
    status?: 'draft' | 'sent' | 'scheduled';
    recipients: Recipient[];
    attachments?: Attachment[];
    createdAt: string;
    updatedAt: string;
}

export type CampaignCreateInput = Omit<Campaign, '_id' | 'createdAt' | 'updatedAt'> & {
    files?: File[];
};

export type CampaignUpdateInput = Campaign & {
    files?: File[];
    removeAttachments?: string[];
};

// --- Yup Schemas ---

export const recipientSchema = yup.object({
    Email: yup
        .string()
        .required('Email is required')
        .matches(
            /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/,
            'Invalid email format (e.g., user@example.com)'
        ),
});

export const createRecipientFieldSchema = (fieldName: string) =>
    yup
        .string()
        .required(`${fieldName} is required`)
        .trim(`${fieldName} must not have leading/trailing spaces`);

export const campaignSaveSchema = yup.object({
    name: yup.string().trim().required('Please enter a campaign name'),
    subject: yup.string().trim().required('Please enter an email subject'),
    recipients: yup
        .array()
        .min(1, 'Please add at least one recipient')
        .required('Please add at least one recipient'),
});

/**
 * Validate all recipients against their dynamic fields.
 * Returns a map of { recipientId: { fieldName: errorMessage } }
 */
export const validateRecipients = async (
    recipients: Recipient[],
    fieldNames: string[],
): Promise<{ errors: Record<string, Record<string, string>>; hasErrors: boolean }> => {
    const errors: Record<string, Record<string, string>> = {};
    let hasErrors = false;

    for (const recipient of recipients) {
        const recipientErrors: Record<string, string> = {};

        for (const fieldName of fieldNames) {
            const raw = recipient[fieldName] || '';

            if (fieldName.toLowerCase() === 'email') {
                try {
                    await recipientSchema.validateAt('Email', { Email: raw });
                } catch (err) {
                    if (err instanceof yup.ValidationError) {
                        recipientErrors[fieldName] = err.message;
                        hasErrors = true;
                    }
                }
            } else {
                try {
                    await createRecipientFieldSchema(fieldName).validate(raw);
                } catch (err) {
                    if (err instanceof yup.ValidationError) {
                        recipientErrors[fieldName] = err.message;
                        hasErrors = true;
                    }
                }
            }
        }

        if (Object.keys(recipientErrors).length > 0) {
            errors[recipient.id] = recipientErrors;
        }
    }

    return { errors, hasErrors };
};
