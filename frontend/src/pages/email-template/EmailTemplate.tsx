import { useState, useRef, useEffect } from 'react';
import MailEditor, { type MailEditorRef } from '@/components/email-template/MailEditor';
import PreviewModal from '@/components/email-template/PreviewModal';
import RecipientsModal from '@/components/email-template/RecipientsModal';
import { PersonalizationModal } from '@/components/email-template/PersonalizationModal';
import { ContactsIcon, ArrowLeftIcon, EyeIcon, CalendarIcon, FloppyDiskIcon, PaperclipIcon, PlusIcon, InfoIcon } from '@/assets/icons';
import { sendMultipleEmailsApi } from '@/features/email/emailApi';
import { showNotifications } from '@/utils';
import { useAppDispatch } from '@/app/hook';
import type { Campaign, CampaignCreateInput, Recipient } from '@/schema/campaign';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip';

export interface Field {
    id: string;
    name: string;
}

// Convert user input to variable name format (snake_case)
export const toVariableName = (input: string): string => {
    if (!input) return '';
    let result = input.replace(/[\s\-@#$%^&*()+=\[\]{};:'",.<>?/\\|`~!]/g, '_');
    result = result.replace(/_+/g, '_');
    if (result.includes('_')) {
        result = result.toLowerCase();
    }
    result = result.replace(/[^a-zA-Z0-9_]/g, '');
    return result;
};

// Remove leading/trailing underscores
export const cleanVariableName = (input: string): string => {
    return input.replace(/^_+|_+$/g, '');
};

// Convert variable name to display name
export const toDisplayName = (variableName: string): string => {
    if (variableName.includes('_')) {
        return variableName
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    }
    const withSpaces = variableName.replace(/([A-Z])/g, ' $1').trim();
    return withSpaces.charAt(0).toUpperCase() + withSpaces.slice(1);
};

interface EmailTemplateProps {
    campaign: Campaign | null;
    onBack?: () => void;
    onCreate?: (campaign: CampaignCreateInput) => void;
    onUpdate?: (campaign: Campaign) => void;
}

const EmailTemplate = ({ campaign, onBack, onCreate, onUpdate }: EmailTemplateProps) => {
    const dispatch = useAppDispatch();
    const mailEditorRef = useRef<MailEditorRef>(null);

    // UI state
    const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
    const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
    const [isAddVariableOpen, setIsAddVariableOpen] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');

    // Campaign data
    const [content, setContent] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [campaignSubject, setCampaignSubject] = useState('');
    const [fields, setFields] = useState<Field[]>([
        { id: 'default-email', name: 'Email' },
    ]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);

    // Filter out empty rows (used for sending/saving)
    const filledRecipients = recipients.filter(recipient =>
        fields.some(field => (recipient[field.name] || '').trim() !== '')
    );

    // Modal states
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    // Load campaign data when component mounts or campaign changes
    useEffect(() => {
        if (campaign) {
            setCampaignName(campaign.name || '');
            setCampaignSubject(campaign.subject || '');
            setContent(campaign.content || '');

            if (campaign.recipients && campaign.recipients.length > 0) {
                setRecipients(campaign.recipients);

                // Extract fields from recipients
                const recipientKeys = Object.keys(campaign.recipients[0]).filter(key => key !== 'id');
                const extractedFields: Field[] = recipientKeys.map((key, index) => ({
                    id: `field-${index}`,
                    name: key,
                }));
                setFields(extractedFields);
            } else {
                setRecipients([]);
                setFields([{ id: 'default-email', name: 'Email' }]);
            }
        } else {
            setCampaignName('');
            setCampaignSubject('');
            setContent('');
            setRecipients([]);
            setFields([{ id: 'default-email', name: 'Email' }]);
        }
    }, [campaign]);

    const handleAddField = (fieldName: string) => {
        const newField: Field = {
            id: Date.now().toString(),
            name: fieldName,
        };
        setFields([...fields, newField]);
        setRecipients(
            recipients.map((r) => ({
                ...r,
                [fieldName]: '',
            }))
        );
    };

    const handleInsertVariable = (fieldName: string) => {
        mailEditorRef.current?.insertVariable(fieldName);
    };


    const handleVariableNameChange = (value: string) => {
        setNewFieldName(toVariableName(value));
    };

    const handleCreateNewField = () => {
        if (!newFieldName.trim()) {
            showNotifications('error', 'Vui lòng nhập tên biến');
            return;
        }

        const variableName = cleanVariableName(newFieldName);
        if (!variableName) {
            showNotifications('error', 'Tên biến không hợp lệ');
            return;
        }

        if (fields.some(f => f.name === variableName)) {
            showNotifications('error', `Biến "${variableName}" đã tồn tại`);
            return;
        }

        handleAddField(variableName);
        setNewFieldName('');
        setIsAddVariableOpen(false);
    };

    const onSendEmails = async () => {
        try {
            await dispatch(sendMultipleEmailsApi({ recipients: filledRecipients, content, subject: campaignSubject })).unwrap();
            showNotifications('success', 'Sent emails successfully to all recipients');
        } catch (err) {
            showNotifications('error', err instanceof Error ? err.message : 'Failed to send emails');
        }
    }

    const handleSaveCampaign = () => {
        if (!campaignName.trim()) {
            showNotifications('error', 'Please enter a campaign name');
            return;
        }
        if (!campaignSubject.trim()) {
            showNotifications('error', 'Please enter an email subject');
            return;
        }
        if (filledRecipients.length === 0) {
            showNotifications('error', 'Please add at least one recipient');
            return;
        }

        if (campaign?.createdAt) {
            const updatedCampaign: Campaign = {
                _id: campaign._id,
                name: campaignName,
                subject: campaignSubject,
                content: content,
                recipients: filledRecipients,
                createdAt: campaign.createdAt,
                updatedAt: new Date().toISOString().split('T')[0],
            };
            onUpdate?.(updatedCampaign);
        } else {
            const newCampaign: CampaignCreateInput = {
                name: campaignName,
                subject: campaignSubject,
                content: content,
                recipients: filledRecipients,
            };
            onCreate?.(newCampaign);
        }

        showNotifications('success', campaign?.createdAt ? 'Campaign updated' : 'Campaign created');
    }

    return (
        <div className="h-screen flex flex-col bg-background overflow-hidden">
            {/* Top Bar */}
            <div className="bg-card border-b shrink-0 z-10">
                <div className="max-w-350 mx-auto px-6 py-4">
                    <div className="flex items-center justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-4 flex-1 min-w-0">
                            {onBack && (
                                <Button variant="ghost" size="icon" onClick={onBack}>
                                    <ArrowLeftIcon className="size-5" />
                                </Button>
                            )}
                            <Input
                                value={campaignName}
                                onChange={(e) => setCampaignName(e.target.value)}
                                className="text-lg md:text-xl font-semibold border-0 shadow-none focus-visible:ring-1 max-w-md"
                                placeholder="Tên chiến dịch"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsPreviewModalOpen(true)}
                            >
                                <EyeIcon className="size-4 mr-2" />
                                Preview
                            </Button>

                            <Button variant="outline" size="sm">
                                <CalendarIcon className="size-4 mr-2" />
                                Schedule
                            </Button>

                            {(onCreate || onUpdate) && (
                                <Button variant="outline" size="sm" onClick={handleSaveCampaign}>
                                    <FloppyDiskIcon className="size-4 mr-2" />
                                    Save
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsRecipientsModalOpen(true)}
                            >
                                <ContactsIcon className="size-4 mr-2" />
                                Recipients ({filledRecipients.length})
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <TooltipProvider>
                <div className="flex-1 min-h-0 max-w-350 w-full mx-auto px-6 py-8">
                    <div className="bg-card rounded-lg shadow-sm border p-8 h-full flex flex-col gap-6">
                        {filledRecipients.length === 0 && (
                            <div className="shrink-0 bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                    Bạn chưa có người nhận nào. Hãy click vào nút <strong>Recipients</strong> ở góc trên bên phải để thêm người nhận.
                                </p>
                            </div>
                        )}

                        <div className="shrink-0 space-y-2">
                            <Label htmlFor="subject">Tiêu đề Email</Label>
                            <Input
                                id="subject"
                                value={campaignSubject}
                                onChange={(e) => setCampaignSubject(e.target.value)}
                                placeholder="Nhập tiêu đề email của bạn..."
                                className="text-lg"
                            />
                        </div>

                        <div className="flex-1 min-h-0 flex flex-col gap-2">
                            <div className="flex items-center gap-2">
                                <Label>Nội dung Email</Label>
                                {fields.length > 0 && (
                                    <Tooltip>
                                        <TooltipTrigger asChild>
                                            <span className="inline-flex cursor-help">
                                                <InfoIcon className="size-4 text-muted-foreground" />
                                            </span>
                                        </TooltipTrigger>
                                        <TooltipContent side="right" className="max-w-xs">
                                            <div className="space-y-2">
                                                <p className="font-semibold text-sm">
                                                    Gợi ý: Bạn có thể sử dụng các biến sau trong email:
                                                </p>
                                                <div className="flex flex-wrap gap-1.5">
                                                    {fields.map(field => (
                                                        <code key={field.id} className="px-2 py-0.5 bg-secondary text-secondary-foreground rounded text-xs">
                                                            {`{{${field.name}}}`}
                                                        </code>
                                                    ))}
                                                </div>
                                            </div>
                                        </TooltipContent>
                                    </Tooltip>
                                )}
                            </div>

                            {/* Variable insertion & attachment buttons */}
                            <div className="flex items-center justify-between gap-3">
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsPersonalizationOpen(true)}
                                >
                                    <PlusIcon className="size-4 mr-2" />
                                    Add personalization
                                </Button>
                                <Button type="button" variant="outline" size="sm">
                                    <PaperclipIcon className="size-4 mr-2" />
                                    Đính kèm
                                </Button>
                            </div>

                            {/* Editor */}
                            <div className="flex-1 min-h-0 border rounded-md overflow-hidden bg-white dark:bg-background">
                                <MailEditor
                                    ref={mailEditorRef}
                                    content={content}
                                    onContentChange={setContent}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </TooltipProvider>

            {/* Preview Modal */}
            <PreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                content={content}
                subject={campaignSubject}
                recipients={recipients}
                fields={fields}
                previewIndex={previewIndex}
                onPreviewIndexChange={setPreviewIndex}
                onSend={onSendEmails}
            />

            {/* Personalization Modal */}
            <PersonalizationModal
                open={isPersonalizationOpen}
                onOpenChange={setIsPersonalizationOpen}
                variables={fields}
                onSelectVariable={handleInsertVariable}
                onCreateVariable={() => setIsAddVariableOpen(true)}
            />

            {/* New Variable Dialog - stacked above PersonalizationModal */}
            <Dialog open={isAddVariableOpen} onOpenChange={setIsAddVariableOpen}>
                <DialogContent className="z-60">
                    <DialogHeader>
                        <DialogTitle>Thêm biến mới</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="variableName">Tên biến:</Label>
                            <Input
                                id="variableName"
                                value={newFieldName}
                                onChange={(e) => handleVariableNameChange(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateNewField();
                                }}
                                placeholder="Ví dụ: firstName, lastName, phone..."
                                autoFocus
                            />
                            {newFieldName && (
                                <p className="text-xs text-muted-foreground">
                                    Tên hiển thị: <span className="font-medium">{toDisplayName(newFieldName)}</span>
                                </p>
                            )}
                        </div>
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsAddVariableOpen(false)}>
                            Hủy
                        </Button>
                        <Button type="button" onClick={handleCreateNewField} disabled={!newFieldName.trim()}>
                            Thêm
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Recipients Modal */}
            <RecipientsModal
                isOpen={isRecipientsModalOpen}
                onClose={() => setIsRecipientsModalOpen(false)}
                recipients={recipients}
                fields={fields}
                onSave={(newRecipients, newFields) => {
                    setRecipients(newRecipients);
                    setFields(newFields);
                }}
            />
        </div>
    );
};

export default EmailTemplate;
