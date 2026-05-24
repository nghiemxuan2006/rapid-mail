import { useState } from 'react';
import {
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { BaseModal } from '@/components/ui/base-modal';
import type { Field } from '@/pages/email-template/EmailTemplate';
import type { FileAttachment } from '@/pages/email-template/EmailTemplate';
import type { Recipient } from '@/schema/campaign';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Send, Paperclip, FileText, Image as ImageIcon, File as FileIcon } from 'lucide-react';
import SendScheduleModal from '@/components/email-template/SendScheduleModal';
import { resolveTemplateText } from '@/utils/resolveTemplateText';
import type { RecipientSchedule, SendMethod } from '@/components/email-template/SendScheduleModal';

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    subject?: string;
    recipients: Recipient[];
    fields: Field[];
    attachments?: FileAttachment[];
    previewIndex: number;
    onPreviewIndexChange: (index: number) => void;
    onSend?: (method: SendMethod, schedules?: RecipientSchedule[]) => void;
    isSending?: boolean;
    signature?: string;
}

const PreviewModal = ({
    isOpen,
    onClose,
    content,
    subject = '',
    recipients,
    fields,
    attachments = [],
    previewIndex,
    onPreviewIndexChange,
    onSend,
    isSending = false,
    signature,
}: PreviewModalProps) => {
    const [selectOpen, setSelectOpen] = useState(false);
    const [isSendScheduleOpen, setIsSendScheduleOpen] = useState(false);

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / Math.pow(1024, index);
        return `${Math.round(value * 100) / 100} ${units[index]}`;
    };

    const currentRecipient = recipients[previewIndex] || {};

    const resolveText = (text: string) => {
        const fieldMap = Object.fromEntries(
            fields.map((f) => [f.name, currentRecipient[f.name] || '']),
        );
        return resolveTemplateText(text, fieldMap);
    };

    const resolvedSubject = resolveText(subject);
    const resolvedContent = resolveText(content);

    const getAttachmentIcon = (type: string) => {
        if (type.startsWith('image/')) return ImageIcon;
        if (type.includes('pdf')) return FileText;
        return FileIcon;
    };

    return (
        <BaseModal open={isOpen} onOpenChange={(open) => !open && onClose()} size="3xl">
            <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle>Xem trước Email</DialogTitle>
            </DialogHeader>

            <div className="flex-1 overflow-auto px-6 py-4">
                {recipients.length === 0 ? (
                    <div className="flex items-center justify-center p-12">
                        <div className="text-center text-muted-foreground">
                            <div className="text-5xl mb-3 opacity-40">📧</div>
                            <p>Không có người nhận nào để xem trước.</p>
                            <p className="text-sm mt-1">Vui lòng thêm người nhận trước khi xem trước email.</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Recipient Selector */}
                        <div>
                            <label className="text-sm font-medium mb-2 block">Xem trước cho:</label>
                            <Select
                                value={String(previewIndex)}
                                onValueChange={(value) => onPreviewIndexChange(Number(value))}
                                onOpenChange={setSelectOpen}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent position="popper" className="z-60" sideOffset={4}>
                                    {recipients.map((r, idx) => (
                                        <SelectItem key={r.id} value={String(idx)}>
                                            {r[fields[0]?.name] || `Recipient ${idx + 1}`}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Preview Card */}
                        <div className="border rounded-lg p-6 bg-white dark:bg-card space-y-4">
                            <div>
                                <label className="text-sm font-medium text-muted-foreground">Tiêu đề:</label>
                                <p className="text-lg mt-1">
                                    <span dangerouslySetInnerHTML={{ __html: resolvedSubject || '(Không có tiêu đề)' }} />
                                </p>
                            </div>

                            <div className="border-t pt-4">
                                <label className="text-sm font-medium text-muted-foreground">Nội dung:</label>
                                <div
                                    className="mt-2 prose max-w-none dark:prose-invert text-sm leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: resolvedContent || '<p>(Không có nội dung)</p>' }}
                                />
                                {signature && (
                                    <div className="mt-6 pt-4 border-t">
                                        <div
                                            className="prose max-w-none dark:prose-invert text-sm"
                                            dangerouslySetInnerHTML={{ __html: signature }}
                                        />
                                    </div>
                                )}
                            </div>

                            {attachments.length > 0 && (
                                <div className="border-t pt-4">
                                    <label className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                                        <Paperclip className="size-4" />
                                        Tệp đính kèm ({attachments.length})
                                    </label>
                                    <div className="mt-2 space-y-2">
                                        {attachments.map((attachment) => {
                                            const AttachmentIcon = getAttachmentIcon(attachment.type);
                                            return (
                                                <div
                                                    key={attachment.id}
                                                    className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border border-border hover:bg-muted/70 transition-colors"
                                                >
                                                    <div className="shrink-0">
                                                        <AttachmentIcon className="size-5 text-muted-foreground" />
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="text-sm font-medium truncate">{attachment.name}</p>
                                                        <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {onSend && (
                <DialogFooter className="px-6 py-4 border-t">
                    <Button onClick={() => setIsSendScheduleOpen(true)} disabled={isSending}>
                        <Send className="mr-2 size-4" />
                        {isSending ? 'Đang gửi...' : 'Gửi Email'}
                    </Button>
                </DialogFooter>
            )}

            <SendScheduleModal
                open={isSendScheduleOpen}
                onOpenChange={setIsSendScheduleOpen}
                recipients={recipients}
                onConfirm={(method, schedules) => {
                    setIsSendScheduleOpen(false);
                    onClose();
                    onSend?.(method, schedules);
                }}
            />
        </BaseModal>
    );
};

export default PreviewModal;
