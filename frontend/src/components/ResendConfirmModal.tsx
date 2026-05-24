import { DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { BaseModal } from '@/components/ui/base-modal';
import { Button } from '@/components/ui/button';
import { AlertCircle } from 'lucide-react';
import type { RecipientDeliveryStatus } from '@/schema/campaign';

interface ResendConfirmModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    recipients: RecipientDeliveryStatus[];
    onConfirm: () => void;
}

export function ResendConfirmModal({
    open,
    onOpenChange,
    recipients,
    onConfirm,
}: ResendConfirmModalProps) {
    const failureReasons = recipients.reduce(
        (acc, r) => {
            const reason = r.failureReason ?? 'other';
            acc[reason] = (acc[reason] ?? 0) + 1;
            return acc;
        },
        {} as Record<string, number>,
    );

    const firstSentAt = recipients[0]?.sentAt;
    const minutesAgo = firstSentAt
        ? Math.floor((Date.now() - firstSentAt.getTime()) / 60000)
        : null;
    const timeAgoLabel =
        minutesAgo !== null
            ? minutesAgo < 60
                ? `${minutesAgo} minutes ago`
                : `${Math.floor(minutesAgo / 60)} hours ago`
            : null;

    return (
        <BaseModal open={open} onOpenChange={onOpenChange} size="md">
            <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Resend Failed Emails</DialogTitle>
            </DialogHeader>

            <div className="px-6 py-4 space-y-4">
                <p className="text-sm">You are about to resend emails to:</p>

                <div className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">Recipients:</span>
                        <span className="text-sm font-bold">{recipients.length}</span>
                    </div>
                    {timeAgoLabel && (
                        <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Last sent:</span>
                            <span className="text-sm">{timeAgoLabel}</span>
                        </div>
                    )}
                </div>

                {Object.keys(failureReasons).length > 0 && (
                    <div className="space-y-2">
                        <p className="text-sm font-medium">Failure reasons:</p>
                        <ul className="text-sm space-y-1">
                            {Object.entries(failureReasons).map(([reason, count]) => (
                                <li
                                    key={reason}
                                    className="flex items-center gap-2 text-muted-foreground"
                                >
                                    <span>•</span>
                                    <span className="capitalize">
                                        {reason.replace('_', ' ')}: {count}
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </div>
                )}

                <div className="flex items-start gap-2 p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg">
                    <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                    <p className="text-xs text-amber-700 dark:text-amber-300">
                        Note: Some emails may fail again for the same reason. Please verify the
                        issues before resending.
                    </p>
                </div>
            </div>

            <DialogFooter className="px-6 py-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                    Cancel
                </Button>
                <Button onClick={onConfirm}>Confirm Resend</Button>
            </DialogFooter>
        </BaseModal>
    );
}
