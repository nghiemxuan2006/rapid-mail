import * as yup from 'yup';

export type RecipientStatus = 'success' | 'failed' | 'pending';

export type FailureReason = 'invalid_email' | 'smtp_error' | 'bounced' | 'rate_limit' | 'blocked' | 'other';

export interface RetryAttempt {
    status: RecipientStatus;
    attemptedAt: Date;
    reason?: string;
}

export interface RecipientDeliveryStatus {
    id: string;
    email: string;
    status: RecipientStatus;
    sentAt?: Date;
    failureReason?: FailureReason;
    errorMessage?: string;
    serverResponse?: string;
    retryHistory?: RetryAttempt[];
    recipientData?: Record<string, string>;
}

export interface CampaignStats {
    total: number;
    success: number;
    failed: number;
    pending: number;
    successRate: number;
    failureBreakdown: Record<FailureReason, number>;
}

export interface DeliveryAttachment {
    id: string;
    name: string;
    size: number;
    type: string;
}

export interface CustomColumn {
    id: string;
    name: string;
}

export interface CampaignDeliveryDetails {
    id: string;
    name: string;
    subject: string;
    content: string;
    sentAt?: Date;
    status: string;
    stats: CampaignStats;
    deliveryRecipients: RecipientDeliveryStatus[];
    signature?: string;
    attachments?: DeliveryAttachment[];
    customColumns?: CustomColumn[];
}

export interface SentCampaignSummary {
    id: string;
    campaignName: string;
    subject: string;
    sentAt: string;
    totalRecipients: number;
    successCount: number;
    failedCount: number;
}

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

export type CampaignStatus = 'draft' | 'sending' | 'completed' | 'failed';
export type SendMode = 'now' | 'schedule_all' | 'schedule_individual';

export interface EmailJob {
    recipientData: Record<string, string>;
    status: 'pending' | 'sent' | 'failed' | 'cancelled';
    scheduledAt: string;
    sentAt: string | null;
    error: string | null;
    retryCount: number;
}

export interface Campaign {
    _id: string;
    name: string;
    subject: string;
    content: string;
    status?: CampaignStatus;
    sendMode?: SendMode | null;
    email_jobs?: Record<string, EmailJob>;
    recipients: Recipient[];
    attachments?: Attachment[];
    signature?: string;
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
        // trim trước khi kiểm tra: "   " sẽ báo "Email is required" thay vì lỗi format
        .trim()
        .required('Email is required')
        .matches(
            /^(?!\.)(?!.*\.\.)([A-Za-z0-9_'+\-.]*)[[A-Za-z0-9_+-]@([A-Za-z0-9][A-Za-z0-9-]*\.)+[A-Za-z]{2,}$/,
            'Invalid email format (e.g., user@example.com)'
        ),
});

export const createRecipientFieldSchema = (fieldName: string) =>
    yup
        .string()
        // .trim() ở chế độ non-strict là transform, không phải test —
        // khoảng trắng thừa được cắt tự động rồi mới kiểm tra required
        .trim()
        .required(`${fieldName} is required`);

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
 * Returns a map of { recipientId: { fieldName: errorMessage } } plus the
 * sanitized recipients (giá trị đã được trim) để caller lưu xuống DB.
 */
export const validateRecipients = async (
    recipients: Recipient[],
    fieldNames: string[],
): Promise<{
    errors: Record<string, Record<string, string>>;
    hasErrors: boolean;
    sanitized: Recipient[];
}> => {
    const errors: Record<string, Record<string, string>> = {};
    const sanitized: Recipient[] = [];
    let hasErrors = false;

    for (const recipient of recipients) {
        const recipientErrors: Record<string, string> = {};
        const sanitizedRecipient: Recipient = { ...recipient };

        for (const fieldName of fieldNames) {
            const raw = recipient[fieldName] || '';

            try {
                const casted =
                    fieldName.toLowerCase() === 'email'
                        ? await recipientSchema.validateAt('Email', { Email: raw })
                        : await createRecipientFieldSchema(fieldName).validate(raw);
                sanitizedRecipient[fieldName] = casted ?? '';
            } catch (err) {
                if (err instanceof yup.ValidationError) {
                    recipientErrors[fieldName] = err.message;
                    hasErrors = true;
                }
            }
        }

        if (Object.keys(recipientErrors).length > 0) {
            errors[recipient.id] = recipientErrors;
        }
        sanitized.push(sanitizedRecipient);
    }

    return { errors, hasErrors, sanitized };
};
