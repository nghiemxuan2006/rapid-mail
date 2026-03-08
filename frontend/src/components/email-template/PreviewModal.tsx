import { useState } from 'react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { Field } from '@/pages/email-template/EmailTemplate';
import styles from './PreviewModal.module.scss';
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
        <div className={styles.overlay} onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <h2 className={styles.title}>Email Preview</h2>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Recipient Selector */}
                {recipients.length > 0 && (
                    <div className={styles.recipientSection}>
                        <label className={styles.recipientLabel}>Preview for:</label>
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
                <div className={styles.previewCard} style={selectOpen ? { overflow: 'hidden' } : undefined}>
                    {content ? (
                        <>
                            <div className={styles.previewSection}>
                                <span className={styles.previewLabel}>Subject:</span>
                                <div
                                    className={styles.previewSubject}
                                    dangerouslySetInnerHTML={{ __html: resolvedSubject || '<span class="empty">No subject</span>' }}
                                />
                            </div>
                            <div className={styles.divider} />
                            <div className={styles.previewSection}>
                                <span className={styles.previewLabel}>Content:</span>
                                <div
                                    className={styles.previewContent}
                                    dangerouslySetInnerHTML={{ __html: resolvedContent }}
                                />
                            </div>
                        </>
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📧</div>
                            <div className={styles.emptyText}>Start writing your email template</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.sendBtn} onClick={onSend}>
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
