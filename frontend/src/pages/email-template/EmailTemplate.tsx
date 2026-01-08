import { useState } from 'react';
import styles from './EmailTemplate.module.scss';
import MailEditor from '@/components/email-template/MailEditor';
import FieldsTab from '@/components/email-template/FieldsTab';
import RecipientsTab from '@/components/email-template/RecipientsTab';

export interface Field {
    id: string;
    name: string;
}

export interface Recipient {
    id: string;
    [key: string]: string;
}

const EmailTemplate = () => {
    const [content, setContent] = useState('');
    const [fields, setFields] = useState<Field[]>([
        { id: '1', name: 'Name' },
        { id: '2', name: 'Email' },
        { id: '3', name: 'Birthday' },
    ]);
    const [recipients, setRecipients] = useState<Recipient[]>([
        {
            id: '1',
            Name: 'John Doe',
            Email: 'john@example.com',
            Birthday: '1990-01-15',
        },
        {
            id: '2',
            Name: 'Jane Smith',
            Email: 'jane@example.com',
            Birthday: '1992-05-20',
        },
    ]);
    const [activeTab, setActiveTab] = useState<'fields' | 'recipients'>('fields');
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

    const handleAddField = (fieldName: string) => {
        const newField: Field = {
            id: Date.now().toString(),
            name: fieldName,
        };
        setFields([...fields, newField]);
        // Add empty value to all recipients
        setRecipients(
            recipients.map((r) => ({
                ...r,
                [fieldName]: '',
            }))
        );
    };

    const handleDeleteField = (fieldId: string) => {
        const fieldToDelete = fields.find((f) => f.id === fieldId);
        if (!fieldToDelete) return;

        setFields(fields.filter((f) => f.id !== fieldId));
        setRecipients(
            recipients.map((r) => {
                const { [fieldToDelete.name]: _field, ...rest } = r;
                return { ...rest, id: r.id } as Recipient;
            })
        );
    };

    const handleInsertVariable = (fieldName: string) => {
        // Variable insertion is now handled directly by MailEditor
        // This function is kept for backward compatibility
    };

    const handleUpdateRecipient = (
        recipientId: string,
        fieldName: string,
        value: string
    ) => {
        setRecipients(
            recipients.map((r) =>
                r.id === recipientId ? { ...r, [fieldName]: value } : r
            )
        );
    };

    const handleAddRecipient = () => {
        const newRecipient: Recipient = {
            id: Date.now().toString(),
        };
        fields.forEach((f) => {
            newRecipient[f.name] = '';
        });
        setRecipients([...recipients, newRecipient]);
    };

    const handleDeleteRecipient = (recipientId: string) => {
        setRecipients(recipients.filter((r) => r.id !== recipientId));
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Custom Email Content Builder</h1>
                <p>Design personalized emails by using variables that adapt to each recipient</p>
            </div>

            <div className={styles.mainContent}>
                {/* Left: Editor */}
                <div className={styles.editorSection}>
                    <MailEditor content={content} onContentChange={setContent} />
                </div>

                {/* Right: Tabs */}
                <div className={styles.rightPanel}>
                    <div className={styles.tabButtons}>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'fields' ? styles.active : ''
                                }`}
                            onClick={() => setActiveTab('fields')}
                        >
                            Fields
                        </button>
                        <button
                            className={`${styles.tabBtn} ${activeTab === 'recipients' ? styles.active : ''
                                }`}
                            onClick={() => setActiveTab('recipients')}
                        >
                            Recipients
                        </button>
                    </div>

                    <div className={styles.tabContent}>
                        {activeTab === 'fields' && (
                            <FieldsTab
                                fields={fields}
                                onInsert={handleInsertVariable}
                                onAddField={handleAddField}
                                onDeleteField={handleDeleteField}
                            />
                        )}
                        {activeTab === 'recipients' && (
                            <RecipientsTab
                                recipients={recipients}
                                fields={fields}
                                onUpdateRecipient={handleUpdateRecipient}
                                onAddRecipient={handleAddRecipient}
                                onDeleteRecipient={handleDeleteRecipient}
                            />
                        )}
                    </div>

                    {/* Preview Action Button Only */}
                    <div className={styles.previewAction}>
                        <button
                            className={styles.previewBtn}
                            onClick={() => setIsPreviewModalOpen(true)}
                        >
                            Full Screen
                        </button>
                    </div>

                    {/* Preview Modal */}
                    {isPreviewModalOpen && (
                        <div className={styles.modalOverlay} onClick={() => setIsPreviewModalOpen(false)}>
                            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
                                <div className={styles.modalHeader}>
                                    <h2>Email Preview</h2>
                                    <button
                                        className={styles.closeBtn}
                                        onClick={() => setIsPreviewModalOpen(false)}
                                    >
                                        ×
                                    </button>
                                </div>
                                <div className={styles.modalBody}>
                                    {renderPreview(content, recipients[previewIndex] || {}, fields)}
                                </div>
                                {recipients.length > 0 && (
                                    <div className={styles.modalFooter}>
                                        <select
                                            value={previewIndex}
                                            onChange={(e) => setPreviewIndex(Number(e.target.value))}
                                            className={styles.modalRecipientSelector}
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
                    )}
                </div>
            </div>
        </div>
    );
};

// Helper function to render preview content with HTML
function renderPreview(
    htmlContent: string,
    recipient: Recipient,
    fields: Field[]
) {
    let preview = htmlContent;

    // Replace variables in format [FieldName] or {{FieldName || 'fallback'}}
    fields.forEach((field) => {
        const value = recipient[field.name] || '';

        // Replace [FieldName]
        preview = preview.replace(
            new RegExp(`\\[${field.name}\\]`, 'g'),
            value || `<span style="color: #ccc; background: #f0f0f0;">[${field.name}]</span>`
        );

        // Replace {{FieldName || 'fallback'}}
        preview = preview.replace(
            new RegExp(`\\{\\{${field.name}\\s*\\|\\|\\s*['"]([^'"]+)['"]\\}\\}`, 'g'),
            (_match, fallback) => value || fallback
        );
    });

    return (
        <div
            className="preview-text"
            dangerouslySetInnerHTML={{ __html: preview }}
            style={{
                padding: '12px',
                backgroundColor: '#f9f9f9',
                borderRadius: '4px',
                lineHeight: '1.6',
            }}
        />
    );
}

export default EmailTemplate;
