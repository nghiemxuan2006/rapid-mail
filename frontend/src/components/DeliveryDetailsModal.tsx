import { useMemo } from 'react';
import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BaseModal } from '@/components/ui/base-modal';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
    CheckCircle2,
    XCircle,
    Clock,
    RefreshCw,
    Paperclip,
    FileText,
    FileImage,
    File,
} from 'lucide-react';
import type { RecipientDeliveryStatus, RecipientStatus, DeliveryAttachment } from '@/schema/campaign';
import { resolveTemplateText } from '@/utils/resolveTemplateText';

interface DeliveryDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipient: RecipientDeliveryStatus;
    onResend: () => void;
    subject?: string;
    content?: string;
    signature?: string;
    attachments?: DeliveryAttachment[];
}

const FAILURE_REASON_LABELS: Record<string, string> = {
    invalid_email: 'Invalid Email Format',
    smtp_error: 'SMTP Connection Error',
    bounced: 'Email Bounced',
    rate_limit: 'Rate Limit Exceeded',
    blocked: 'Email Blocked',
    other: 'Other Error',
};

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getFileIcon(type: string = '') {
    if (type.startsWith('image/')) return FileImage;
    if (type.includes('pdf') || type.includes('document')) return FileText;
    return File;
}

function StatusIcon({ status }: { status: RecipientStatus }) {
    if (status === 'success') return <CheckCircle2 className="h-5 w-5 text-green-600" />;
    if (status === 'failed') return <XCircle className="h-5 w-5 text-red-600" />;
    return <Clock className="h-5 w-5 text-amber-600" />;
}

function StatusBadge({ status }: { status: RecipientStatus }) {
    const variants: Record<RecipientStatus, string> = {
        success: 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400',
        failed: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400',
        pending: 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400',
    };
    return (
        <Badge className={`${variants[status]} border-0`}>
            <StatusIcon status={status} />
            <span className="ml-1 capitalize">{status}</span>
        </Badge>
    );
}

export function DeliveryDetailsModal({
    open,
    onOpenChange,
    recipient,
    onResend,
    subject = '',
    content = '',
    signature = '',
    attachments = [],
}: DeliveryDetailsModalProps) {
    const replaceVariables = (text: string) => resolveTemplateText(text, recipient.recipientData ?? {});

    const previewSubject = useMemo(() => replaceVariables(subject), [subject, recipient]);
    const previewContent = useMemo(() => replaceVariables(content), [content, recipient]);

    return (
        <BaseModal open={open} onOpenChange={onOpenChange} size="3xl">
            <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Delivery Details</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto px-6 py-4">
                <div className="space-y-4">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-1">Recipient</p>
                        <p className="text-lg font-semibold">{recipient.email}</p>
                    </div>

                    <Separator />

                    <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Status</p>
                        <StatusBadge status={recipient.status} />
                    </div>

                    {recipient.sentAt && (
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">Sent At</p>
                            <p>
                                {recipient.sentAt.toLocaleDateString()} at{' '}
                                {recipient.sentAt.toLocaleTimeString()}
                            </p>
                        </div>
                    )}

                    {recipient.status === 'failed' && (
                        <>
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-1">
                                    Failure Reason
                                </p>
                                <p className="text-red-600">
                                    {recipient.failureReason
                                        ? (FAILURE_REASON_LABELS[recipient.failureReason] ??
                                          recipient.failureReason)
                                        : 'N/A'}
                                </p>
                            </div>
                            {recipient.errorMessage && (
                                <div>
                                    <p className="text-sm font-medium text-muted-foreground mb-1">
                                        Error Message
                                    </p>
                                    <p className="text-sm bg-muted p-3 rounded-md font-mono">
                                        {recipient.errorMessage}
                                    </p>
                                </div>
                            )}
                        </>
                    )}

                    {recipient.serverResponse && (
                        <div>
                            <p className="text-sm font-medium text-muted-foreground mb-1">
                                Server Response
                            </p>
                            <p className="text-sm bg-muted p-3 rounded-md font-mono">
                                {recipient.serverResponse}
                            </p>
                        </div>
                    )}

                    {recipient.retryHistory && recipient.retryHistory.length > 0 && (
                        <>
                            <Separator />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-3">
                                    Retry History
                                </p>
                                <div className="space-y-2">
                                    {recipient.retryHistory.map((attempt, index) => (
                                        <div
                                            key={index}
                                            className="flex items-center justify-between p-3 border rounded-lg"
                                        >
                                            <div className="flex items-center gap-3">
                                                <StatusIcon status={attempt.status} />
                                                <div>
                                                    <p className="text-sm font-medium capitalize">
                                                        {attempt.status}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {attempt.attemptedAt.toLocaleDateString()} at{' '}
                                                        {attempt.attemptedAt.toLocaleTimeString()}
                                                    </p>
                                                </div>
                                            </div>
                                            {attempt.reason && (
                                                <p className="text-xs text-muted-foreground">
                                                    {attempt.reason}
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </>
                    )}

                    {subject && content && (
                        <>
                            <Separator />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-3">
                                    Email Preview
                                </p>
                                <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-1">
                                            Subject:
                                        </p>
                                        <p className="font-medium">
                                            {previewSubject || '(No subject)'}
                                        </p>
                                    </div>

                                    <Separator />

                                    <div>
                                        <p className="text-xs font-medium text-muted-foreground mb-2">
                                            Content:
                                        </p>
                                        <div
                                            className="prose prose-sm max-w-none dark:prose-invert"
                                            dangerouslySetInnerHTML={{
                                                __html: previewContent || '<p>(No content)</p>',
                                            }}
                                        />
                                        {signature && (
                                            <div className="mt-4 pt-3 border-t">
                                                <div
                                                    className="prose prose-sm max-w-none dark:prose-invert"
                                                    dangerouslySetInnerHTML={{ __html: signature }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </>
                    )}

                    {attachments.length > 0 && (
                        <>
                            <Separator />
                            <div>
                                <p className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-1">
                                    <Paperclip className="size-4" />
                                    Attachments ({attachments.length})
                                </p>
                                <div className="space-y-2">
                                    {attachments.map((att) => {
                                        const Icon = getFileIcon(att.type);
                                        return (
                                            <div
                                                key={att.id}
                                                className="flex items-center gap-2 p-2 rounded bg-muted border"
                                            >
                                                <Icon className="size-4 text-muted-foreground shrink-0" />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-medium truncate">
                                                        {att.name}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        {formatFileSize(att.size)}
                                                    </p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Close
                </Button>
                {recipient.status === 'failed' && (
                    <Button
                        onClick={() => {
                            onResend();
                            onOpenChange(false);
                        }}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Resend Email
                    </Button>
                )}
            </DialogFooter>
        </BaseModal>
    );
}
