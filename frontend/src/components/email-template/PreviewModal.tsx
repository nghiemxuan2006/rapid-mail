import type { Field } from '@/pages/email-template/EmailTemplate';
import styles from './PreviewModal.module.scss';
import type { Recipient } from '@/schema/campaign';

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
    if (!isOpen) return null;

    const currentRecipient = recipients[previewIndex] || {};

    const renderPreview = () => {
        let preview = content;
        const missingVariables: string[] = [];

        // Replace variables in format [FieldName] or {{FieldName || 'fallback'}}
        fields.forEach((field) => {
            const value = currentRecipient[field.name] || '';

            // Track missing variables
            if (!value) {
                // Check if this variable is actually used in the content
                const simpleVarRegex = new RegExp(`\\[${field.name}\\]`, 'g');
                const fallbackVarRegex = new RegExp(`\\{\\{${field.name}\\s*\\|\\|\\s*['"]([^'"]+)['"]\\}\\}`, 'g');

                if (simpleVarRegex.test(content) && !fallbackVarRegex.test(content)) {
                    missingVariables.push(field.name);
                }
            }

            // Replace [FieldName]
            preview = preview.replace(
                new RegExp(`\\[${field.name}\\]`, 'g'),
                value ?
                    `<span class="resolved-var">${value}</span>` :
                    `<span class="missing-var" title="Missing data">⚠️ [${field.name}]</span>`
            );

            // Replace {{FieldName || 'fallback'}}
            preview = preview.replace(
                new RegExp(`\\{\\{${field.name}\\s*\\|\\|\\s*['"]([^'"]+)['"]\\}\\}`, 'g'),
                (_match, fallback) => {
                    const displayValue = value || fallback;
                    return `<span class="${value ? 'resolved-var' : 'fallback-var'}" title="${value ? 'From data' : 'Fallback value'}">${displayValue}</span>`;
                }
            );
        });

        return { preview, missingVariables };
    };

    const { preview, missingVariables } = renderPreview();

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <h2>Live Preview</h2>
                        <div className={styles.headerControls}>
                            <div className={styles.subjectContainer}>
                                <label className={styles.subjectLabel}>Subject</label>
                                <div className={styles.subjectDisplay}>
                                    {subject || <span className={styles.emptySubject}>No subject</span>}
                                </div>
                            </div>
                            {recipients.length > 0 && (
                                <div className={styles.recipientContainer}>
                                    <label className={styles.recipientLabel}>Recipient</label>
                                    <select
                                        value={previewIndex}
                                        onChange={(e) => onPreviewIndexChange(Number(e.target.value))}
                                        className={styles.recipientSelector}
                                    >
                                        {recipients.map((r, idx) => (
                                            <option key={r.id} value={idx}>
                                                {r[fields[0]?.name] || `Recipient ${idx + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            )}
                        </div>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        ×
                    </button>
                </div>

                {/* Missing Data Warning */}
                {missingVariables.length > 0 && (
                    <div className={styles.warningBanner}>
                        <span className={styles.warningIcon}>⚠️</span>
                        <div className={styles.warningContent}>
                            <div className={styles.warningTitle}>Missing Data</div>
                            <div className={styles.warningText}>
                                {missingVariables.join(', ')}
                            </div>
                        </div>
                    </div>
                )}

                <div className={styles.previewContent}>
                    {content ? (
                        <div
                            className={styles.previewHtml}
                            dangerouslySetInnerHTML={{ __html: preview }}
                        />
                    ) : (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyIcon}>📧</div>
                            <div className={styles.emptyText}>Start writing your email template</div>
                            <div className={styles.emptyHint}>Use variables to personalize for each recipient</div>
                        </div>
                    )}
                </div>

                <div className={styles.footer}>
                    <button className={styles.sendBtn} onClick={onSend}>
                        Send Mail
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PreviewModal;
