import { useState, useRef } from 'react';
import styles from './EmailTemplate.module.scss';
import MailEditor, { type MailEditorRef } from '@/components/email-template/MailEditor';
import VariablesPanel from '@/components/email-template/VariablesPanel';
import PreviewModal from '@/components/email-template/PreviewModal';
import RecipientsModal from '@/components/email-template/RecipientsModal';
import { sendMultipleEmailsApi } from '@/features/email/emailApi';
import { showNotifications } from '@/utils';
import { useAppDispatch } from '@/app/hook';

export interface Field {
    id: string;
    name: string;
}

export interface Recipient {
    id: string;
    [key: string]: string;
}

const EmailTemplate = () => {
    const dispatch = useAppDispatch();
    const mailEditorRef = useRef<MailEditorRef>(null);
    const [content, setContent] = useState('');
    const [fields, setFields] = useState<Field[]>([
        { id: 'default-email', name: 'Email' },
    ]);
    const [recipients, setRecipients] = useState<Recipient[]>([
        {
            id: '1',
            Email: 'meonghiem@gmail.com',
        },
    ]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
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

        // Prevent deleting Email field
        if (fieldToDelete.name.toLowerCase() === 'email') {
            alert('Email field cannot be deleted as it is required.');
            return;
        }

        setFields(fields.filter((f) => f.id !== fieldId));
        setRecipients(
            recipients.map((r) => {
                const { [fieldToDelete.name]: _field, ...rest } = r;
                return { ...rest, id: r.id } as Recipient;
            })
        );
    };

    const handleInsertVariable = (fieldName: string) => {
        mailEditorRef.current?.insertVariable(fieldName);
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

    const onSendEmails = async () => {
        try {
            await dispatch(sendMultipleEmailsApi({ receivers: recipients, content })).unwrap();
            showNotifications('success', 'Đã gửi email thành công đến tất cả người nhận');
        } catch (err) {
            showNotifications('error', err instanceof Error ? err.message : 'Gửi email thất bại');
        }
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h1>Custom Email Content Builder</h1>
                <div className={styles.headerActions}>
                    <button
                        className={styles.previewBtn}
                        onClick={() => setIsPreviewModalOpen(true)}
                    >
                        👁️ Preview
                    </button>
                    <button
                        className={styles.recipientsBtn}
                        onClick={() => setIsRecipientsModalOpen(true)}
                    >
                        👥 Manage Recipients ({recipients.length})
                    </button>
                </div>
            </div>

            <div className={styles.mainContent}>
                {/* Left: Variables Panel */}
                <div className={styles.variablesPanel}>
                    <VariablesPanel
                        fields={fields}
                        recipients={recipients}
                        onInsert={handleInsertVariable}
                        onAddField={handleAddField}
                        onDeleteField={handleDeleteField}
                    />
                </div>

                {/* Right: Editor */}
                <div className={styles.editorSection}>
                    <MailEditor ref={mailEditorRef} content={content} onContentChange={setContent} />
                </div>
            </div>

            {/* Preview Modal */}
            <PreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                content={content}
                recipients={recipients}
                fields={fields}
                previewIndex={previewIndex}
                onPreviewIndexChange={setPreviewIndex}
                onSend={onSendEmails}
            />

            {/* Recipients Modal */}
            <RecipientsModal
                isOpen={isRecipientsModalOpen}
                onClose={() => setIsRecipientsModalOpen(false)}
                recipients={recipients}
                fields={fields}
                onUpdateRecipient={handleUpdateRecipient}
                onAddRecipient={handleAddRecipient}
                onDeleteRecipient={handleDeleteRecipient}
            />
        </div>
    );
};

export default EmailTemplate;
