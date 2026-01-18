import { useState, useRef, useEffect } from 'react';
import styles from './EmailTemplate.module.scss';
import MailEditor, { type MailEditorRef } from '@/components/email-template/MailEditor';
import VariablesPanel from '@/components/email-template/VariablesPanel';
import PreviewModal from '@/components/email-template/PreviewModal';
import RecipientsModal from '@/components/email-template/RecipientsModal';
import { ContactsIcon, SendEmailIcon, DuplicateIcon } from '@/assets/icons';
import { sendMultipleEmailsApi } from '@/features/email/emailApi';
import { showNotifications } from '@/utils';
import { useAppDispatch } from '@/app/hook';
import type { Campaign, CampaignCreateInput, Recipient } from '@/schema/campaign';

export interface Field {
    id: string;
    name: string;
}

interface EmailTemplateProps {
    campaign: Campaign | null;
    onBack?: () => void;
    onCreate?: (campaign: CampaignCreateInput) => void;
    onUpdate?: (campaign: Campaign) => void;
}

const EmailTemplate = ({ campaign, onBack, onCreate, onUpdate }: EmailTemplateProps) => {
    const dispatch = useAppDispatch();
    const mailEditorRef = useRef<MailEditorRef>(null);
    const [content, setContent] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [campaignSubject, setCampaignSubject] = useState('');
    const [fields, setFields] = useState<Field[]>([
        { id: 'default-email', name: 'Email' },
    ]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);
    const [isSaveModalOpen, setIsSaveModalOpen] = useState(false);

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
                // Reset to default when no recipients
                setRecipients([]);
                setFields([{ id: 'default-email', name: 'Email' }]);
            }
        } else {
            // Reset all fields when creating new campaign
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
            Email: '',
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

    const handleSaveCampaign = () => {
        if (!campaignName.trim()) {
            showNotifications('error', 'Vui lòng nhập tên campaign');
            return;
        }
        if (!campaignSubject.trim()) {
            showNotifications('error', 'Vui lòng nhập subject email');
            return;
        }

        // If campaign has createdAt, it's an existing campaign (update)
        // Otherwise, it's a new campaign (create)
        if (campaign?.createdAt) {
            const updatedCampaign: Campaign = {
                _id: campaign._id,
                name: campaignName,
                subject: campaignSubject,
                content: content,
                recipients: recipients,
                createdAt: campaign.createdAt,
                updatedAt: new Date().toISOString().split('T')[0],
            };
            onUpdate?.(updatedCampaign);
        } else {
            const newCampaign: CampaignCreateInput = {
                name: campaignName,
                subject: campaignSubject,
                content: content,
                recipients: recipients,
            };
            onCreate?.(newCampaign);
        }

        showNotifications('success', campaign?.createdAt ? 'Đã cập nhật campaign' : 'Đã tạo campaign mới');
        setIsSaveModalOpen(false);
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                {onBack && (
                    <button className={styles.backBtn} onClick={onBack}>
                        ← Quay lại
                    </button>
                )}
                <h1>Custom Email Content Builder</h1>
                <div className={styles.headerActions}>
                    <button
                        className={styles.previewBtn}
                        onClick={() => setIsPreviewModalOpen(true)}
                    >
                        <SendEmailIcon className={styles.icon} />
                        Preview
                    </button>
                    <button
                        className={styles.recipientsBtn}
                        onClick={() => setIsRecipientsModalOpen(true)}
                    >
                        <ContactsIcon className={styles.icon} />
                        Manage Recipients ({recipients.length})
                    </button>
                    {(onCreate || onUpdate) && (
                        <button
                            className={styles.saveBtn}
                            onClick={() => setIsSaveModalOpen(true)}
                        >
                            <DuplicateIcon className={styles.icon} />
                            {campaign?.createdAt ? 'Cập nhật' : 'Tạo mới'}
                        </button>
                    )}
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

            {/* Save Campaign Modal */}
            {isSaveModalOpen && (
                <div className={styles.modalOverlay} onClick={() => setIsSaveModalOpen(false)}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h2>{campaign?._id ? 'Cập nhật Campaign' : 'Tạo Campaign Mới'}</h2>
                            <button className={styles.closeBtn} onClick={() => setIsSaveModalOpen(false)}>
                                ✕
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <div className={styles.formGroup}>
                                <label htmlFor="campaignName">Tên Campaign *</label>
                                <input
                                    id="campaignName"
                                    type="text"
                                    placeholder="Nhập tên campaign"
                                    value={campaignName}
                                    onChange={(e) => setCampaignName(e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                            <div className={styles.formGroup}>
                                <label htmlFor="campaignSubject">Subject Email *</label>
                                <input
                                    id="campaignSubject"
                                    type="text"
                                    placeholder="Nhập subject email"
                                    value={campaignSubject}
                                    onChange={(e) => setCampaignSubject(e.target.value)}
                                    className={styles.input}
                                />
                            </div>
                        </div>
                        <div className={styles.modalFooter}>
                            <button className={styles.cancelBtn} onClick={() => setIsSaveModalOpen(false)}>
                                Hủy
                            </button>
                            <button className={styles.submitBtn} onClick={handleSaveCampaign}>
                                {campaign?._id ? 'Cập nhật' : 'Tạo mới'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailTemplate;
