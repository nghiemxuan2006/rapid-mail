import { useState } from 'react';
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
import type {
    CampaignDeliveryDetails,
    RecipientDeliveryStatus,
    RecipientStatus,
    FailureReason,
} from '@/schema/campaign';

interface CampaignDetailsModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    campaign: CampaignDeliveryDetails;
}

const FAILURE_REASON_LABELS: Record<string, string> = {
    invalid_email: 'Invalid Email',
    smtp_error: 'SMTP Error',
    bounced: 'Bounced',
    rate_limit: 'Rate Limit',
    blocked: 'Blocked',
    other: 'Other',
};

function getFailureReasonText(reason?: string) {
    return reason ? (FAILURE_REASON_LABELS[reason] ?? reason) : '-';
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
        <Badge className={`${variants[status]} border-0 gap-1`}>
            <StatusIcon status={status} />
            <span className="capitalize">{status}</span>
        </Badge>
    );
}

type Tab = 'overview' | 'recipients' | 'content';

export function CampaignDetailsModal({ open, onOpenChange, campaign }: CampaignDetailsModalProps) {
    const [activeTab, setActiveTab] = useState<Tab>('overview');
    const [searchQuery, setSearchQuery] = useState('');
    const [statusFilter, setStatusFilter] = useState<'all' | RecipientStatus>('all');

    const filteredRecipients = campaign.deliveryRecipients.filter((r) => {
        const matchesSearch = r.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus = statusFilter === 'all' || r.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    const tabs: { key: Tab; label: string }[] = [
        { key: 'overview', label: 'Overview' },
        { key: 'recipients', label: 'Recipients' },
        { key: 'content', label: 'Content' },
    ];

    return (
        <BaseModal open={open} onOpenChange={onOpenChange} size="6xl">
            <DialogHeader className="px-6 pt-6 pb-4 border-b">
                <DialogTitle className="text-2xl">{campaign.name}</DialogTitle>
                {campaign.sentAt && (
                    <p className="text-sm text-muted-foreground mt-1">
                        Sent on {campaign.sentAt.toLocaleDateString()} at{' '}
                        {campaign.sentAt.toLocaleTimeString()}
                    </p>
                )}
            </DialogHeader>

            <div className="flex-1 overflow-y-auto px-6 py-4">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold">{campaign.stats.total}</p>
                                <p className="text-sm text-muted-foreground mt-1">Total Recipients</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <div className="flex items-center justify-center gap-2">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <p className="text-3xl font-bold text-green-600">{campaign.stats.success}</p>
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
                                    <p className="text-3xl font-bold text-red-600">{campaign.stats.failed}</p>
                                </div>
                                <p className="text-sm text-muted-foreground mt-1">Failed</p>
                            </div>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-[#9d7d59]">
                                    {campaign.stats.successRate.toFixed(1)}%
                                </p>
                                <p className="text-sm text-muted-foreground mt-1">Success Rate</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Tabs */}
                <div className="border-b mb-6">
                    <div className="flex gap-6">
                        {tabs.map((tab) => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`pb-4 px-1 border-b-2 transition-colors ${
                                    activeTab === tab.key
                                        ? 'border-[#9d7d59] text-[#9d7d59]'
                                        : 'border-transparent text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Overview Tab */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <Card>
                            <CardContent className="pt-6">
                                <h3 className="font-semibold mb-4">Failure Breakdown</h3>
                                {campaign.stats.failed === 0 ? (
                                    <p className="text-sm text-muted-foreground">No failures recorded.</p>
                                ) : (
                                    <div className="space-y-3">
                                        {(Object.entries(campaign.stats.failureBreakdown) as [FailureReason, number][]).map(
                                            ([reason, count]) => {
                                                if (count === 0) return null;
                                                const pct = ((count / campaign.stats.failed) * 100).toFixed(0);
                                                return (
                                                    <div key={reason} className="flex items-center justify-between">
                                                        <div className="flex items-center gap-2">
                                                            <div className="w-2 h-2 rounded-full bg-red-500" />
                                                            <span className="text-sm">{getFailureReasonText(reason)}</span>
                                                        </div>
                                                        <span className="text-sm text-muted-foreground">
                                                            {count} ({pct}%)
                                                        </span>
                                                    </div>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                )}

                {/* Recipients Tab */}
                {activeTab === 'recipients' && (
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
                                    onValueChange={(v) => setStatusFilter(v as typeof statusFilter)}
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
                            {campaign.stats.failed > 0 && (
                                <Button className="w-full sm:w-auto">
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Resend Failed ({campaign.stats.failed})
                                </Button>
                            )}
                        </div>

                        <p className="text-sm text-muted-foreground">
                            Showing {filteredRecipients.length} of {campaign.stats.total} recipients
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
                                            <tr key={recipient.id} className="border-b last:border-0 hover:bg-muted/50">
                                                <td className="p-4">{recipient.email}</td>
                                                <td className="p-4">
                                                    <StatusBadge status={recipient.status} />
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    {getFailureReasonText(recipient.failureReason)}
                                                </td>
                                                <td className="p-4 text-sm text-muted-foreground">
                                                    {recipient.sentAt?.toLocaleTimeString() ?? '-'}
                                                </td>
                                                <td className="p-4">
                                                    <div className="flex items-center gap-2">
                                                        <Button variant="ghost" size="icon">
                                                            <Eye className="h-4 w-4" />
                                                        </Button>
                                                        {recipient.status === 'failed' && (
                                                            <Button variant="ghost" size="icon">
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
                )}

                {/* Content Tab */}
                {activeTab === 'content' && (
                    <Card>
                        <CardContent className="pt-6">
                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold mb-2">Subject</h3>
                                    <p className="text-muted-foreground">{campaign.subject}</p>
                                </div>
                                <div>
                                    <h3 className="font-semibold mb-2">Content</h3>
                                    <div
                                        className="prose max-w-none dark:prose-invert"
                                        dangerouslySetInnerHTML={{ __html: campaign.content }}
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </div>
        </BaseModal>
    );
}
