import { useState } from 'react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
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
import { Paperclip, FileText, Image as ImageIcon, File as FileIcon } from 'lucide-react';

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
    onSend?: () => void;
    isSending?: boolean;
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
}: PreviewModalProps) => {
    const [selectOpen, setSelectOpen] = useState(false);
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const units = ['B', 'KB', 'MB', 'GB'];
        const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
        const value = bytes / Math.pow(1024, index);
        return `${Math.round(value * 100) / 100} ${units[index]}`;
    };

    const currentRecipient = recipients[previewIndex] || {};

    const resolveText = (text: string) => {
        let resolved = text;
        fields.forEach((field) => {
            const value = currentRecipient[field.name] || '';
            // Replace [FieldName]
            resolved = resolved.replace(
                new RegExp(`\\[${field.name}\\]`, 'g'),
                value ? `<strong>${value}</strong>` : `[${field.name}]`
            );
            // Replace {{FieldName || 'fallback'}}
            resolved = resolved.replace(
                new RegExp(`\\{\\{${field.name}\\s*\\|\\|\\s*['"]([^'"]+)['"]\\}\\}`, 'g'),
                (_match, fallback) => {
                    const displayValue = value || fallback;
                    return `<strong>${displayValue}</strong>`;
                }
            );
        });
        return resolved;
    };

    const resolvedSubject = resolveText(subject);
    const resolvedContent = resolveText(content);

    const getAttachmentIcon = (type: string) => {
        if (type.startsWith('image/')) return ImageIcon;
        if (type.includes('pdf')) return FileText;
        return FileIcon;
    };

    return (
        <div
            className="fixed inset-0 z-1000 flex items-center justify-center bg-black/55 px-4 py-6 backdrop-blur-[1px]"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div
                className="bg-card border border-border rounded-2xl shadow-2xl w-full max-w-250 max-h-[85vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex justify-between items-center px-6 py-4 border-b border-border/80">
                    <div>
                        <h2 className="text-xl font-semibold text-foreground">Email Preview</h2>
                        {recipients.length > 0 && (
                            <p className="text-sm text-muted-foreground mt-0.5">
                                Recipient {previewIndex + 1} of {recipients.length}
                            </p>
                        )}
                    </div>
                    <button className="hover:bg-accent rounded-md p-1" onClick={onClose}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Recipient Selector */}
                {recipients.length > 0 && (
                    <div className="px-6 pt-4 pb-2 flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">Preview for recipient</label>
                        <Select
                            value={String(previewIndex)}
                            onValueChange={(value) => onPreviewIndexChange(Number(value))}
                            onOpenChange={setSelectOpen}
                        >
                            <SelectTrigger className="h-10 border border-border bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-1100 bg-popover shadow-lg border border-border rounded-lg" sideOffset={4}>
                                {recipients.map((r, idx) => (
                                    <SelectItem key={r.id} value={String(idx)}>
                                        {r[fields[0]?.name] || `Recipient ${idx + 1}`}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}

                {/* Preview Card */}
                <div
                    className="mx-6 mb-3 border border-border rounded-xl flex-1 overflow-y-auto min-h-0 bg-background/45"
                    style={selectOpen ? { overflow: 'hidden' } : undefined}
                >
                    {content ? (
                        <div className="p-5 bg-card space-y-5">
                            <div>
                                <span className="block text-sm text-foreground font-medium mb-2">Tiêu đề:</span>
                                <div
                                    className="text-base text-foreground font-normal"
                                    dangerouslySetInnerHTML={{ __html: resolvedSubject || '<span class="empty">No subject</span>' }}
                                />
                            </div>
                            <div className="border-t border-border pt-4">
                                <span className="block text-sm text-foreground font-medium mb-2">Nội dung:</span>
                                <div
                                    className="text-sm text-foreground leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: resolvedContent }}
                                />
                            </div>
                            {attachments.length > 0 && (
                                <div className="border-t border-border pt-4">
                                    <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <Paperclip className="size-4 text-primary" />
                                        <span>Tệp đính kèm ({attachments.length})</span>
                                    </div>

                                    <ul className="space-y-2 max-h-52 overflow-y-auto pr-2">
                                        {attachments.map((attachment) => {
                                            const AttachmentIcon = getAttachmentIcon(attachment.type);

                                            return (
                                                <li
                                                    key={attachment.id}
                                                    className="text-sm text-foreground flex items-start gap-3 rounded-lg border border-border/50 bg-muted/30 hover:bg-muted/50 px-3 py-2.5 transition-colors duration-200"
                                                >
                                                    <div className="size-8 rounded-md border border-border/60 bg-background flex items-center justify-center shrink-0 mt-0.5">
                                                        <AttachmentIcon className="size-3.5 text-primary" />
                                                    </div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="truncate text-sm font-medium text-foreground leading-snug">{attachment.name}</p>
                                                        <p className="text-xs text-muted-foreground mt-1">{formatFileSize(attachment.size)}</p>
                                                    </div>
                                                </li>
                                            );
                                        })}
                                    </ul>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center bg-card h-full min-h-75">
                            <div className="text-5xl mb-3 opacity-40">📧</div>
                            <div className="text-sm text-muted-foreground font-medium">Start writing your email template</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border/80 flex justify-end items-center gap-3">
                    <Button onClick={onSend} disabled={isSending} className="px-6">
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                        {isSending ? 'Sending...' : 'Send Email'}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
