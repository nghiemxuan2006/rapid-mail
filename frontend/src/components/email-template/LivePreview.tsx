import type { Field, Recipient } from '@/pages/email-template/EmailTemplate';
import styles from './LivePreview.module.scss';

interface LivePreviewProps {
    content: string;
    recipients: Recipient[];
    fields: Field[];
    previewIndex: number;
    onPreviewIndexChange: (index: number) => void;
}

const LivePreview = ({ content, recipients, fields, previewIndex, onPreviewIndexChange }: LivePreviewProps) => {
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
        <div className={styles.container}>
            <div className={styles.header}>
                <h3>Live Preview</h3>
                {recipients.length > 0 && (
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
                )}
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

            {/* Preview Legend */}
            <div className={styles.legend}>
                <div className={styles.legendTitle}>Legend:</div>
                <div className={styles.legendItems}>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#4caf50' }}></span>
                        <span>Resolved</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#ff9800' }}></span>
                        <span>Fallback</span>
                    </div>
                    <div className={styles.legendItem}>
                        <span className={styles.legendDot} style={{ background: '#f44336' }}></span>
                        <span>Missing</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LivePreview;
