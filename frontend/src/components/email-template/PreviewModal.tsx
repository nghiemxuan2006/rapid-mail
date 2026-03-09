import { useState } from 'react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { Field } from '@/pages/email-template/EmailTemplate';
import type { Recipient } from '@/schema/campaign';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';

interface PreviewModalProps {
    isOpen: boolean;
    onClose: () => void;
    content: string;
    subject?: string;
    recipients: Recipient[];
    fields: Field[];
    previewIndex: number;
    onPreviewIndexChange: (index: number) => void;
    onSend?: () => void;
}

const PreviewModal = ({
    isOpen,
    onClose,
    content,
    subject = '',
    recipients,
    fields,
    previewIndex,
    onPreviewIndexChange,
    onSend
}: PreviewModalProps) => {
    const [selectOpen, setSelectOpen] = useState(false);
    useLockBodyScroll(isOpen);

    if (!isOpen) return null;

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

    return (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-1000" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className="bg-card rounded-xl shadow-2xl w-[90vw] max-w-225 h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-center px-6 pt-5 pb-4">
                    <h2 className="text-lg font-semibold text-foreground">Email Preview</h2>
                    <button className="ghost hover:bg-accent rounded-md p-1" onClick={onClose}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Recipient Selector */}
                {recipients.length > 0 && (
                    <div className="px-6 pb-4 flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-foreground">Preview for:</label>
                        <Select
                            value={String(previewIndex)}
                            onValueChange={(value) => onPreviewIndexChange(Number(value))}
                            onOpenChange={setSelectOpen}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" className="z-1100 bg-white shadow-lg border border-gray-200 rounded-lg" sideOffset={4}>
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
                <div className="mx-6 border border-border rounded-lg flex-1 overflow-y-auto min-h-75" style={selectOpen ? { overflow: 'hidden' } : undefined}>
                    {content ? (
                        <>
                            <div className="p-4 px-5">
                                <span className="block text-xs text-muted-foreground mb-1.5">Subject:</span>
                                <div
                                    className="text-base text-foreground"
                                    dangerouslySetInnerHTML={{ __html: resolvedSubject || '<span class="empty">No subject</span>' }}
                                />
                            </div>
                            <div className="h-px bg-border mx-5" />
                            <div className="p-4 px-5">
                                <span className="block text-xs text-muted-foreground mb-1.5">Content:</span>
                                <div
                                    className="text-sm text-foreground leading-relaxed"
                                    dangerouslySetInnerHTML={{ __html: resolvedContent }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <div className="text-5xl mb-3 opacity-40">📧</div>
                            <div className="text-sm text-muted-foreground font-medium">Start writing your email template</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 pt-4 pb-5 flex justify-end">
                    <button className="bg-primary text-primary-foreground px-7 py-2.5 rounded-lg font-medium flex items-center gap-2 hover:bg-primary/90" onClick={onSend}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="18" height="18">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 12 3.269 3.125A59.769 59.769 0 0 1 21.485 12 59.768 59.768 0 0 1 3.27 20.875L5.999 12Zm0 0h7.5" />
                        </svg>
                        Send Email
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
