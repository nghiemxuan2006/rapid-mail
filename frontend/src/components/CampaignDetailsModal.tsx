import { useEffect, useMemo, useState } from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BaseModal } from '@/components/ui/base-modal';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, XCircle, Clock, RefreshCw, Eye, Search } from 'lucide-react';
import type { Campaign, RecipientDeliveryStatus, RecipientStatus, FailureReason } from '@/schema/campaign';
import { DeliveryDetailsModal } from '@/components/DeliveryDetailsModal';
import { ResendConfirmModal } from '@/components/ResendConfirmModal';
import { getCampaignByIdApi } from '@/features/campaign/campaignApi';
import { useAppDispatch } from '@/app/hook';

interface CampaignDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaignId: string;
}

function parseFailureReason(error: string | null): FailureReason {
    if (!error) return 'other';
    const e = error.toLowerCase();
    if (e.includes('invalid') || e.includes('format')) return 'invalid_email';
    if (e.includes('smtp') || e.includes('connection')) return 'smtp_error';
    if (e.includes('bounce') || e.includes('mailbox')) return 'bounced';
    if (e.includes('rate') || e.includes('limit')) return 'rate_limit';
    if (e.includes('block')) return 'blocked';
    return 'other';
}

function StatusIcon({ status }: { status: RecipientStatus }) {
    if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (status === 'failed') return <XCircle className="h-4 w-4 text-red-600" />;
    return <Clock className="h-4 w-4 text-amber-600" />;
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

const FAILURE_REASON_LABELS: Record<string, string> = {
    invalid_email: 'Invalid Email',
    smtp_error: 'SMTP Error',
    bounced: 'Bounced',
    rate_limit: 'Rate Limit',
    blocked: 'Blocked',
    other: 'Other',
};

export function CampaignDetailsModal({ open, onOpenChange, campaignId }: CampaignDetailsModalProps) {
    const dispatch = useAppDispatch();
    const [campaign, setCampaign] = useState<Campaign | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | RecipientStatus>('all');
    const [selectedRecipient, setSelectedRecipient] = useState<RecipientDeliveryStatus | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isResendModalOpen, setIsResendModalOpen] = useState(false);
    const [recipientsToResend, setRecipientsToResend] = useState<RecipientDeliveryStatus[]>([]);

    useEffect(() => {
        if (!open) return;
        dispatch(getCampaignByIdApi({ id: campaignId })).then((action) => {
            if (getCampaignByIdApi.fulfilled.match(action)) {
                setCampaign(action.payload);
            }
        });
    }, [open, campaignId]);

    const deliveryRecipients = useMemo<RecipientDeliveryStatus[]>(() => {
        return Object.entries(campaign?.email_jobs ?? {}).map(([key, job]) => {
            const status: RecipientStatus =
                job.status === 'sent' ? 'success' : job.status === 'failed' ? 'failed' : 'pending';
            return {
                id: key,
                email: job.recipientData?.Email ?? '',
                status,
                sentAt: job.sentAt ? new Date(job.sentAt) : undefined,
                failureReason: job.status === 'failed' ? parseFailureReason(job.error) : undefined,
                errorMessage: job.error ?? undefined,
                recipientData: job.recipientData,
            };
        });
    }, [campaign?.email_jobs]);

    const stats = useMemo(() => {
        const success = deliveryRecipients.filter((r) => r.status === 'success').length;
        const failed = deliveryRecipients.filter((r) => r.status === 'failed').length;
        const total = deliveryRecipients.length;
        return {
            total,
            success,
            failed,
            successRate: total > 0 ? (success / total) * 100 : 0,
        };
    }, [deliveryRecipients]);

    // Earliest sentAt across all jobs, used as campaign sent time
    const campaignSentAt = useMemo(() => {
        const times = deliveryRecipients
            .map((r) => r.sentAt?.getTime())
            .filter((t): t is number => t !== undefined);
        return times.length > 0 ? new Date(Math.min(...times)) : undefined;
    }, [deliveryRecipients]);

    const campaignAttachments = useMemo(
        () =>
            (campaign?.attachments ?? []).map((att) => ({
                id: att.storedName,
                name: att.filename,
                size: att.size,
                type: att.mimeType,
            })),
        [campaign?.attachments],
    );

    const filteredRecipients = deliveryRecipients.filter((r) => {
        const matchesSearch = r.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const handleViewDetails = (recipient: RecipientDeliveryStatus) => {
        setSelectedRecipient(recipient);
        setIsDetailsModalOpen(true);
    };

    const handleResendSingle = (recipient: RecipientDeliveryStatus) => {
        setRecipientsToResend([recipient]);
        setIsResendModalOpen(true);
    };

    const handleResendAllFailed = () => {
        setRecipientsToResend(deliveryRecipients.filter((r) => r.status === 'failed'));
        setIsResendModalOpen(true);
    };

    return (
        <>
            <BaseModal open={open} onOpenChange={onOpenChange} size="6xl">
                <DialogHeader className="px-6 pt-6 pb-4 border-b">
                    <DialogTitle className="text-2xl">{campaign?.name}</DialogTitle>
                    {campaignSentAt && (
                        <p className="text-sm text-muted-foreground mt-1">
                            Sent on {campaignSentAt.toLocaleDateString()} at{' '}
                            {campaignSentAt.toLocaleTimeString()}
                        </p>
                    )}
                </DialogHeader>

                <div className="flex-1 overflow-y-auto px-6 py-4">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-3xl font-bold">{stats.total}</p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Total Recipients
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <CheckCircle2 className="h-5 w-5 text-green-600" />
                                        <p className="text-3xl font-bold text-green-600">
                                            {stats.success}
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">Success</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <div className="flex items-center justify-center gap-2">
                                        <XCircle className="h-5 w-5 text-red-600" />
                                        <p className="text-3xl font-bold text-red-600">
                                            {stats.failed}
                                        </p>
                                    </div>
                                    <p className="text-sm text-muted-foreground mt-1">Failed</p>
                                </div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6">
                                <div className="text-center">
                                    <p className="text-3xl font-bold text-[#9d7d59]">
                                        {stats.successRate.toFixed(1)}%
                                    </p>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Success Rate
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Recipients List */}
                    <div className="space-y-4">
                        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                                <div className="relative flex-1 sm:w-64">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="Search by email..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="pl-9"
                                    />
                                </div>
                                <Select
                                    value={statusFilter}
                                    onValueChange={(v) =>
                                        setStatusFilter(v as typeof statusFilter)
                                    }
                                >
                                    <SelectTrigger className="w-full sm:w-40">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="all">All Status</SelectItem>
                                        <SelectItem value="success">Success</SelectItem>
                                        <SelectItem value="failed">Failed</SelectItem>
                                        <SelectItem value="pending">Pending</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            {stats.failed > 0 && (
                                <Button onClick={handleResendAllFailed} className="w-full sm:w-auto">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Resend Failed ({stats.failed})
                                </Button>
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Showing {filteredRecipients.length} of {stats.total} recipients
                        </p>

                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead className="border-b">
                                        <tr className="text-left">
                                            <th className="p-4 font-medium text-muted-foreground">Email</th>
                                            <th className="p-4 font-medium text-muted-foreground">Status</th>
                                            <th className="p-4 font-medium text-muted-foreground">Reason</th>
                                            <th className="p-4 font-medium text-muted-foreground">Time</th>
                                            <th className="p-4 font-medium text-muted-foreground">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredRecipients.map((recipient) => (
                                            <tr
                                                key={recipient.id}
                                                className="border-b last:border-0 hover:bg-muted/50"
                                            >
                                                <td className="p-4">{recipient.email}</td>
                                                <td className="p-4">
                                                    <StatusBadge status={recipient.status} />
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    {recipient.failureReason
                                                        ? (FAILURE_REASON_LABELS[recipient.failureReason] ?? recipient.failureReason)
                                                        : '-'}
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    {recipient.sentAt?.toLocaleTimeString() ?? '-'}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleViewDetails(recipient)}
                                                        >
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {recipient.status === 'failed' && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                onClick={() => handleResendSingle(recipient)}
                                                            >
                                                                <RefreshCw className="h-4 w-4" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </div>
                </div>
            </BaseModal>

            {selectedRecipient && (
                <DeliveryDetailsModal
                    open={isDetailsModalOpen}
                    onOpenChange={setIsDetailsModalOpen}
                    recipient={selectedRecipient}
                    onResend={() => handleResendSingle(selectedRecipient)}
                    subject={campaign?.subject}
                    content={campaign?.content}
                    signature={campaign?.signature}
                    attachments={campaignAttachments}
                />
            )}

            <ResendConfirmModal
                open={isResendModalOpen}
                onOpenChange={setIsResendModalOpen}
                recipients={recipientsToResend}
                onConfirm={() => setIsResendModalOpen(false)}
            />
        </>
    );
}
