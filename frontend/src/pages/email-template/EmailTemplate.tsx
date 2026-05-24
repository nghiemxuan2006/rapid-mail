import { useState, useRef, useEffect } from 'react';
import MailEditor, { type MailEditorRef } from '@/components/email-template/MailEditor';
import PreviewModal from '@/components/email-template/PreviewModal';
import RecipientsModal from '@/components/email-template/RecipientsModal';
import { PersonalizationModal } from '@/components/email-template/PersonalizationModal';
import ScheduleModal from '@/components/email-template/ScheduleModal';
import { ContactsIcon, ArrowLeftIcon, EyeIcon, CalendarIcon, FloppyDiskIcon, PaperclipIcon, PlusIcon, InfoIcon } from '@/assets/icons';
import { sendCampaignApi } from '@/features/campaign/campaignApi';
import type { SendMethod, RecipientSchedule } from '@/components/email-template/SendScheduleModal';
import { showNotifications } from '@/utils';
import { useAppDispatch } from '@/app/hook';
import { type Campaign, type CampaignCreateInput, type CampaignUpdateInput, type Recipient, campaignSaveSchema } from '@/schema/campaign';
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
import { FileText, Image as ImageIcon, File as FileIcon, X, BarChart3 } from 'lucide-react';
import { CampaignDetailsModal } from '@/components/CampaignDetailsModal';

export interface FileAttachment {
    id: string;
    name: string;
    size: number;
    type: string;
    file?: File;
    storedName?: string;
}

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
    onCreate?: (campaign: CampaignCreateInput, options?: { redirect?: boolean }) => Promise<Campaign | void> | Campaign | void;
    onUpdate?: (campaign: CampaignUpdateInput, options?: { redirect?: boolean }) => Promise<Campaign | void> | Campaign | void;
}

const EmailTemplate = ({ campaign, onBack, onCreate, onUpdate }: EmailTemplateProps) => {
    const dispatch = useAppDispatch();
    const mailEditorRef = useRef<MailEditorRef>(null);

    // UI state
    const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
    const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false);
    const [isPersonalizationOpen, setIsPersonalizationOpen] = useState(false);
    const [isAddVariableOpen, setIsAddVariableOpen] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');
    const [campaignMeta, setCampaignMeta] = useState<Campaign | null>(campaign);

    // Campaign data
    const [content, setContent] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [campaignSubject, setCampaignSubject] = useState('');
    const [fields, setFields] = useState<Field[]>([
        { id: 'default-email', name: 'Email' },
    ]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [attachments, setAttachments] = useState<FileAttachment[]>([]);
    const [removedAttachments, setRemovedAttachments] = useState<string[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Filter out empty rows (used for sending/saving)
    const filledRecipients = recipients.filter(recipient =>
        fields.some(field => (recipient[field.name] || '').trim() !== '')
    );

    // Delivery modal
    const [isDeliveryModalOpen, setIsDeliveryModalOpen] = useState(false);

    // Modal states
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isSendingEmails, setIsSendingEmails] = useState(false);
    const isSendingEmailsRef = useRef(false);

    // Load campaign data when component mounts or campaign changes
    useEffect(() => {
        setCampaignMeta(campaign);
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
            if (campaign.attachments && campaign.attachments.length > 0) {
                setAttachments(campaign.attachments.map((att, index) => ({
                    id: `existing-${index}`,
                    name: att.filename,
                    size: att.size,
                    type: att.mimeType,
                    storedName: att.storedName,
                })));
            } else {
                setAttachments([]);
            }
            setRemovedAttachments([]);
        } else {
            setCampaignName('');
            setCampaignSubject('');
            setContent('');
            setRecipients([]);
            setFields([{ id: 'default-email', name: 'Email' }]);
            setAttachments([]);
            setRemovedAttachments([]);
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

    // File attachment helpers
    const ALLOWED_TYPES = [
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/vnd.ms-powerpoint',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp',
        'text/plain',
        'application/zip', 'application/x-zip-compressed',
    ];
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    const MAX_TOTAL_SIZE = 25 * 1024 * 1024; // 25MB

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
    };

    const getFileIcon = (type: string) => {
        if (type.startsWith('image/')) return ImageIcon;
        if (type.includes('pdf')) return FileText;
        return FileIcon;
    };

    const handleFileSelect = (files: FileList | null) => {
        if (!files || files.length === 0) return;

        const newAttachments: FileAttachment[] = [];

        for (let i = 0; i < files.length; i++) {
            const file = files[i];

            if (!ALLOWED_TYPES.includes(file.type)) {
                showNotifications('error', `File "${file.name}" không được hỗ trợ. Chỉ chấp nhận PDF, Office, Images, Text, ZIP.`);
                continue;
            }

            if (file.size > MAX_FILE_SIZE) {
                showNotifications('error', `File "${file.name}" quá lớn (max 10MB).`);
                continue;
            }

            newAttachments.push({
                id: `${Date.now()}-${i}`,
                name: file.name,
                size: file.size,
                type: file.type,
                file: file,
            });
        }

        const currentTotalSize = attachments.reduce((sum, att) => sum + att.size, 0);
        const newTotalSize = newAttachments.reduce((sum, att) => sum + att.size, 0);

        if (currentTotalSize + newTotalSize > MAX_TOTAL_SIZE) {
            showNotifications('error', 'Tổng dung lượng file đính kèm không được vượt quá 25MB.');
            return;
        }

        if (newAttachments.length > 0) {
            setAttachments(prev => [...prev, ...newAttachments]);
            showNotifications('success', `Đã thêm ${newAttachments.length} file đính kèm.`);
        }

        // Reset file input
        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const handleRemoveAttachment = (id: string) => {
        const attachment = attachments.find(att => att.id === id);
        if (attachment?.storedName) {
            setRemovedAttachments(prev => [...prev, attachment.storedName!]);
        }
        setAttachments(prev => prev.filter(att => att.id !== id));
        showNotifications('success', 'Đã xóa file đính kèm.');
    };

    const getTotalAttachmentSize = () => {
        return attachments.reduce((sum, att) => sum + att.size, 0);
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

    const onSendEmails = async (method: SendMethod, schedules?: RecipientSchedule[]) => {
        if (isSendingEmailsRef.current) return;

        isSendingEmailsRef.current = true;
        setIsSendingEmails(true);

        try {
            const savedCampaign = await persistCampaign({ showSuccessToast: false, redirect: false });
            const campaignId = savedCampaign?._id || campaignMeta?._id || campaign?._id;

            if (!campaignId) {
                showNotifications('error', 'Failed to save campaign before sending emails');
                return;
            }

            if (method === 'now') {
                await dispatch(sendCampaignApi({ id: campaignId, sendMode: 'now' })).unwrap();
                showNotifications('success', 'Đang gửi chiến dịch đến tất cả người nhận...');
            } else if (method === 'schedule-all' && schedules?.length) {
                const scheduledAt = schedules[0].scheduledDate.toISOString();
                await dispatch(sendCampaignApi({ id: campaignId, sendMode: 'schedule_all', scheduledAt })).unwrap();
                const d = schedules[0].scheduledDate;
                showNotifications('success', `Đã lên lịch gửi vào ${d.toLocaleDateString('vi-VN')} lúc ${d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}`);
            } else if (method === 'schedule-individual' && schedules?.length) {
                const scheduledTimes: Record<string, string> = {};
                schedules.forEach((s) => { scheduledTimes[s.recipientId] = s.scheduledDate.toISOString(); });
                await dispatch(sendCampaignApi({ id: campaignId, sendMode: 'schedule_individual', scheduledTimes })).unwrap();
                showNotifications('success', `Đã lên lịch cho ${schedules.length} người nhận`);
            }
            onBack?.();
        } catch (err) {
            showNotifications('error', err instanceof Error ? err.message : 'Failed to send emails');
        } finally {
            isSendingEmailsRef.current = false;
            setIsSendingEmails(false);
        }
    }

    const validateCampaignBeforeSave = async () => {
        try {
            await campaignSaveSchema.validate(
                { name: campaignName, subject: campaignSubject, recipients: filledRecipients },
                { abortEarly: true }
            );
        } catch (err) {
            if (err instanceof Error) {
                showNotifications('error', err.message);
            }
            return false;
        }

        return true;
    };

    const persistCampaign = async ({
        showSuccessToast = true,
        redirect = true,
    }: {
        showSuccessToast?: boolean;
        redirect?: boolean;
    } = {}) => {
        const isValid = await validateCampaignBeforeSave();
        if (!isValid) return;

        const newFiles = attachments.filter(att => att.file).map(att => att.file!);

        let savedCampaign: Campaign | void;

        try {
            if (campaignMeta?._id || campaign?._id) {
                const updatedCampaign: CampaignUpdateInput = {
                    _id: campaignMeta?._id || campaign!._id,
                    name: campaignName,
                    subject: campaignSubject,
                    content: content,
                    recipients: filledRecipients,
                    createdAt: campaignMeta?.createdAt || campaign?.createdAt || new Date().toISOString(),
                    updatedAt: new Date().toISOString().split('T')[0],
                    files: newFiles,
                    removeAttachments: removedAttachments,
                };
                savedCampaign = await onUpdate?.(updatedCampaign, { redirect });
            } else {
                const newCampaign: CampaignCreateInput = {
                    name: campaignName,
                    subject: campaignSubject,
                    content: content,
                    recipients: filledRecipients,
                    files: newFiles,
                };
                savedCampaign = await onCreate?.(newCampaign, { redirect });
            }
        } catch (err) {
            showNotifications('error', err instanceof Error ? err.message : 'Failed to save campaign');
            return;
        }

        if (savedCampaign && typeof savedCampaign === 'object' && '_id' in savedCampaign) {
            setCampaignMeta(savedCampaign as Campaign);
            setRemovedAttachments([]);
        }

        if (showSuccessToast) {
            showNotifications('success', campaignMeta?._id || campaign?._id ? 'Campaign updated' : 'Campaign created');
        }

        return savedCampaign;
    };

    const handleSaveCampaign = async () => {
        await persistCampaign();
    }

    const isReadOnly = !!campaignMeta?.status && campaignMeta.status !== 'draft';

    const readOnlyLabel: Record<string, string> = {
        sending: 'Đang gửi',
        completed: 'Đã gửi',
        failed: 'Gửi thất bại',
    };

    return (
        <div className="min-h-screen bg-background">
            {/* Top Bar */}
            <div className="bg-card border-b sticky top-0 z-10">
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
                                onChange={(e) => !isReadOnly && setCampaignName(e.target.value)}
                                readOnly={isReadOnly}
                                className={`text-lg md:text-xl font-semibold focus-visible:ring-2 max-w-md ${isReadOnly ? 'cursor-default focus-visible:ring-0 text-muted-foreground' : ''}`}
                                placeholder="Tên chiến dịch"
                            />
                        </div>

                        <div className="flex items-center gap-2">
                            {campaignMeta?.status === 'completed' && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsDeliveryModalOpen(true)}
                                    className="border-[#9d7d59] text-[#9d7d59] hover:bg-[#9d7d59]/10"
                                >
                                    <BarChart3 className="size-4 mr-2" />
                                    Delivery
                                </Button>
                            )}

                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsPreviewModalOpen(true)}
                            >
                                <EyeIcon className="size-4 mr-2" />
                                Preview
                            </Button>

                            {!isReadOnly && (
                                <Button variant="outline" size="sm" onClick={() => setIsScheduleModalOpen(true)}>
                                    <CalendarIcon className="size-4 mr-2" />
                                    Schedule
                                </Button>
                            )}

                            {(onCreate || onUpdate) && !isReadOnly && (
                                <Button variant="outline" size="sm" onClick={handleSaveCampaign}>
                                    <FloppyDiskIcon className="size-4 mr-2" />
                                    Save
                                </Button>
                            )}

                            {!isReadOnly && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsRecipientsModalOpen(true)}
                                >
                                    <ContactsIcon className="size-4 mr-2" />
                                    Recipients ({filledRecipients.length})
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Read-only banner */}
            {isReadOnly && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border-b border-amber-200 dark:border-amber-800">
                    <div className="max-w-350 mx-auto px-6 py-3 flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300">
                        <span className="font-medium">Chiến dịch đang ở trạng thái "{readOnlyLabel[campaignMeta!.status!]}"</span>
                        <span className="text-amber-600 dark:text-amber-400">— Không thể chỉnh sửa.</span>
                    </div>
                </div>
            )}

            {/* Main Content */}
            <TooltipProvider>
                <div className="max-w-350 w-full mx-auto px-6 py-8">
                    <div className="bg-card rounded-lg shadow-sm border p-8 space-y-6">
                        {!isReadOnly && filledRecipients.length === 0 && (
                            <div className="bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-900 rounded-lg p-4">
                                <p className="text-sm text-amber-800 dark:text-amber-200">
                                    Bạn chưa có người nhận nào. Hãy click vào nút <strong>Recipients</strong> ở góc trên bên phải để thêm người nhận.
                                </p>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label htmlFor="subject">Tiêu đề Email</Label>
                            <Input
                                id="subject"
                                value={campaignSubject}
                                onChange={(e) => !isReadOnly && setCampaignSubject(e.target.value)}
                                readOnly={isReadOnly}
                                placeholder="Nhập tiêu đề email của bạn..."
                                className={`text-lg ${isReadOnly ? 'cursor-default focus-visible:ring-0 text-muted-foreground' : ''}`}
                            />
                        </div>

                        <div className="space-y-2">
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
                            {!isReadOnly && (
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
                                    <div className="relative">
                                        <input
                                            type="file"
                                            multiple
                                            ref={fileInputRef}
                                            className="hidden"
                                            accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.webp,.txt,.zip"
                                            onChange={(e) => handleFileSelect(e.target.files)}
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="sm"
                                            onClick={() => fileInputRef.current?.click()}
                                            className="relative"
                                        >
                                            <PaperclipIcon className="size-4 mr-2" />
                                            Đính kèm
                                            {attachments.length > 0 && (
                                                <span className="absolute -top-1.5 -right-1.5 size-5 flex items-center justify-center text-xs font-semibold bg-primary text-primary-foreground rounded-full">
                                                    {attachments.length}
                                                </span>
                                            )}
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Editor */}
                            <div className={`border rounded-md overflow-hidden bg-white dark:bg-background ${isReadOnly ? 'pointer-events-none select-none opacity-75' : ''}`}>
                                <MailEditor
                                    ref={mailEditorRef}
                                    content={content}
                                    onContentChange={setContent}
                                />
                            </div>

                            {/* Attachments List */}
                            {attachments.length > 0 && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between px-1">
                                        <Label className="text-sm font-medium flex items-center gap-2">
                                            <PaperclipIcon className="size-4" />
                                            File đính kèm ({attachments.length})
                                        </Label>
                                        <span className="text-xs text-muted-foreground">
                                            {formatFileSize(getTotalAttachmentSize())} / 25 MB
                                        </span>
                                    </div>
                                    <div className="grid grid-cols-1 gap-2">
                                        {attachments.map((attachment) => {
                                            const AttachmentIcon = getFileIcon(attachment.type);
                                            return (
                                                <div
                                                    key={attachment.id}
                                                    className="group flex items-center gap-3 p-3 bg-accent/50 hover:bg-accent rounded-lg border transition-colors"
                                                >
                                                    <div className="p-2 bg-background rounded border">
                                                        <AttachmentIcon className="size-4 text-primary" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">
                                                            {attachment.name}
                                                        </p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {formatFileSize(attachment.size)}
                                                        </p>
                                                    </div>
                                                    {!isReadOnly && (
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            className="size-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                                            onClick={() => handleRemoveAttachment(attachment.id)}
                                                        >
                                                            <X className="size-4 text-destructive" />
                                                        </Button>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
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
                attachments={attachments}
                previewIndex={previewIndex}
                onPreviewIndexChange={setPreviewIndex}
                onSend={(!campaignMeta?.status || campaignMeta.status === 'draft') ? onSendEmails : undefined}
                isSending={isSendingEmails}
                signature={campaignMeta?.signature}
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

            {/* Schedule Modal */}
            <ScheduleModal
                isOpen={isScheduleModalOpen}
                onClose={() => setIsScheduleModalOpen(false)}
                onSchedule={(date) => console.log('Scheduled for:', date)}
            />

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

            {/* Delivery Overview Modal */}
            {campaignMeta?.status === 'completed' && (
                <CampaignDetailsModal
                    open={isDeliveryModalOpen}
                    onOpenChange={setIsDeliveryModalOpen}
                    campaignId={campaignMeta!._id}
                />
            )}
        </div>
    );
};

export default EmailTemplate;
