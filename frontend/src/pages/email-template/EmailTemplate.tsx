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

    // UI state
    const [showVariablesPanel, setShowVariablesPanel] = useState(true);
    const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);

    // Campaign data
    const [content, setContent] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [campaignSubject, setCampaignSubject] = useState('');
    const [fields, setFields] = useState<Field[]>([
        { id: 'default-email', name: 'Email' },
    ]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);

    // Modal states
    const [previewIndex, setPreviewIndex] = useState(0);
    const [isPreviewModalOpen, setIsPreviewModalOpen] = useState(false);

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
            await dispatch(sendMultipleEmailsApi({ recipients, content, subject: campaignSubject })).unwrap();
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
        if (recipients.length === 0) {
            showNotifications('error', 'Vui lòng thêm ít nhất một người nhận');
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
    }

    return (
        <div className={styles.container}>
            {/* Top Action Bar */}
            <div className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    {onBack && (
                        <button className={styles.backBtn} onClick={onBack}>
                            ← Back
                        </button>
                    )}
                </div>

                <div className={styles.topBarActions}>
                    <button
                        className={styles.toggleBtn}
                        onClick={() => setShowVariablesPanel(!showVariablesPanel)}
                        title="Toggle Variables Panel"
                    >
                        {showVariablesPanel ? '◧' : '◨'} Variables
                    </button>
                    <button
                        className={styles.toggleBtn}
                        onClick={() => setIsRecipientsModalOpen(true)}
                        title="Manage Recipients"
                    >
                        <ContactsIcon className={styles.icon} />
                        Recipients
                    </button>
                    <button
                        className={styles.actionBtn}
                        onClick={() => setIsPreviewModalOpen(true)}
                    >
                        <SendEmailIcon className={styles.icon} />
                        Preview
                    </button>
                    {(onCreate || onUpdate) && (
                        <button
                            className={styles.saveBtn}
                            onClick={handleSaveCampaign}
                        >
                            <DuplicateIcon className={styles.icon} />
                            {campaign?.createdAt ? 'Update' : 'Save'}
                        </button>
                    )}
                    {/* <button
                        className={styles.sendBtn}
                        onClick={onSendEmails}
                    >
                        <SendEmailIcon className={styles.icon} />
                        Send Now
                    </button> */}
                </div>
            </div>

            {/* Main Workspace */}
            <div className={styles.workspace}>
                {/* Left Sidebar - Campaign Info */}
                <div className={styles.leftSidebar}>
                    <div className={styles.sidebarSection}>
                        <h3 className={styles.sidebarTitle}>📋 Campaign Details</h3>

                        <div className={styles.formField}>
                            <label>Campaign Name *</label>
                            <input
                                type="text"
                                placeholder="Enter campaign name..."
                                value={campaignName}
                                onChange={(e) => setCampaignName(e.target.value)}
                                className={styles.input}
                            />
                        </div>

                        <div className={styles.formField}>
                            <label>Email Subject *</label>
                            <input
                                type="text"
                                placeholder="Your email subject..."
                                value={campaignSubject}
                                onChange={(e) => setCampaignSubject(e.target.value)}
                                className={styles.input}
                            />
                        </div>
                    </div>
                </div>

                {/* Center - Email Editor */}
                <div className={styles.centerContent}>
                    <div className={styles.editorContainer}>
                        <MailEditor
                            ref={mailEditorRef}
                            content={content}
                            onContentChange={setContent}
                        />
                    </div>
                </div>

                {/* Right Panels - Toggleable */}
                {showVariablesPanel && (
                    <div className={styles.rightPanel}>
                        <div className={styles.panelHeader}>
                            <h3>🔖 Variables</h3>
                            <button
                                className={styles.closePanel}
                                onClick={() => setShowVariablesPanel(false)}
                            >
                                ✕
                            </button>
                        </div>
                        <VariablesPanel
                            fields={fields}
                            recipients={recipients}
                            onInsert={handleInsertVariable}
                            onAddField={handleAddField}
                            onDeleteField={handleDeleteField}
                        />
                    </div>
                )}
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
