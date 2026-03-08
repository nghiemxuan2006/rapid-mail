import { useState, useRef, useEffect } from 'react';
import styles from './EmailTemplate.module.scss';
import MailEditor, { type MailEditorRef } from '@/components/email-template/MailEditor';
import PreviewModal from '@/components/email-template/PreviewModal';
import RecipientsModal from '@/components/email-template/RecipientsModal';
import { ContactsIcon, ArrowLeftIcon, EyeIcon, CalendarIcon, FloppyDiskIcon, PaperclipIcon, PlusIcon, InfoIcon } from '@/assets/icons';
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
    const [isRecipientsModalOpen, setIsRecipientsModalOpen] = useState(false);
    const [selectedVariable, setSelectedVariable] = useState('');
    const [showNewFieldInput, setShowNewFieldInput] = useState(false);
    const [newFieldName, setNewFieldName] = useState('');

    // Campaign data
    const [content, setContent] = useState('');
    const [campaignName, setCampaignName] = useState('');
    const [campaignSubject, setCampaignSubject] = useState('');
    const [fields, setFields] = useState<Field[]>([
        { id: 'default-email', name: 'Email' },
    ]);
    const [recipients, setRecipients] = useState<Recipient[]>([]);

    // Filter out empty rows (used for sending/saving)
    const filledRecipients = recipients.filter(recipient =>
        fields.some(field => (recipient[field.name] || '').trim() !== '')
    );

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
                setRecipients([]);
                setFields([{ id: 'default-email', name: 'Email' }]);
            }
        } else {
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

    const handleVariableSelect = (value: string) => {
        if (value) {
            handleInsertVariable(value);
            setSelectedVariable('');
        }
    };

    const handleCreateNewField = () => {
        if (newFieldName.trim()) {
            handleAddField(newFieldName.trim());
            setNewFieldName('');
            setShowNewFieldInput(false);
        }
    };

    const onSendEmails = async () => {
        try {
            await dispatch(sendMultipleEmailsApi({ recipients: filledRecipients, content, subject: campaignSubject })).unwrap();
            showNotifications('success', 'Sent emails successfully to all recipients');
        } catch (err) {
            showNotifications('error', err instanceof Error ? err.message : 'Failed to send emails');
        }
    }

    const handleSaveCampaign = () => {
        if (!campaignName.trim()) {
            showNotifications('error', 'Please enter a campaign name');
            return;
        }
        if (!campaignSubject.trim()) {
            showNotifications('error', 'Please enter an email subject');
            return;
        }
        if (filledRecipients.length === 0) {
            showNotifications('error', 'Please add at least one recipient');
            return;
        }

        if (campaign?.createdAt) {
            const updatedCampaign: Campaign = {
                _id: campaign._id,
                name: campaignName,
                subject: campaignSubject,
                content: content,
                recipients: filledRecipients,
                createdAt: campaign.createdAt,
                updatedAt: new Date().toISOString().split('T')[0],
            };
            onUpdate?.(updatedCampaign);
        } else {
            const newCampaign: CampaignCreateInput = {
                name: campaignName,
                subject: campaignSubject,
                content: content,
                recipients: filledRecipients,
            };
            onCreate?.(newCampaign);
        }

        showNotifications('success', campaign?.createdAt ? 'Campaign updated' : 'Campaign created');
    }

    return (
        <div className={styles.container}>
            {/* Top Action Bar */}
            <div className={styles.topBar}>
                <div className={styles.topBarLeft}>
                    {onBack && (
                        <button className={styles.backBtn} onClick={onBack}>
                            <ArrowLeftIcon className={styles.icon} />
                        </button>
                    )}
                    <input
                        type="text"
                        placeholder="Campaign name..."
                        value={campaignName}
                        onChange={(e) => setCampaignName(e.target.value)}
                        className={styles.campaignNameInput}
                    />
                </div>

                <div className={styles.topBarActions}>
                    <button
                        className={styles.actionBtn}
                        onClick={() => setIsPreviewModalOpen(true)}
                    >
                        <EyeIcon className={styles.icon} />
                        Preview
                    </button>
                    <button className={styles.actionBtn}>
                        <CalendarIcon className={styles.icon} />
                        Schedule
                    </button>
                    {(onCreate || onUpdate) && (
                        <button
                            className={styles.actionBtn}
                            onClick={handleSaveCampaign}
                        >
                            <FloppyDiskIcon className={styles.icon} />
                            Save
                        </button>
                    )}
                    <button
                        className={styles.recipientsBtn}
                        onClick={() => setIsRecipientsModalOpen(true)}
                    >
                        <ContactsIcon className={styles.icon} />
                        Recipients ({filledRecipients.length})
                    </button>
                </div>
            </div>

            {/* Main Content */}
            <div className={styles.mainContent}>
                <div className={styles.card}>
                    {/* Subject */}
                    <div className={styles.section}>
                        <label className={styles.sectionLabel}>Email Subject</label>
                        <input
                            type="text"
                            placeholder="Your email subject..."
                            value={campaignSubject}
                            onChange={(e) => setCampaignSubject(e.target.value)}
                            className={styles.subjectInput}
                        />
                    </div>

                    {/* Email Content */}
                    <div className={styles.section}>
                        <div className={styles.sectionLabelRow}>
                            <label className={styles.sectionLabel}>Email Content</label>
                            {fields.length > 0 && (
                                <div className={styles.infoTooltipWrapper}>
                                    <InfoIcon className={styles.infoIcon} />
                                    <div className={styles.infoTooltip}>
                                        <span>You can use the following variables in your email:</span>
                                        <div className={styles.tooltipVariables}>
                                            {fields.map(field => (
                                                <span key={field.id} className={styles.tooltipBadge}>
                                                    {`{{${field.name}}}`}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Variable insertion bar */}
                        <div className={styles.variableBar}>
                            <div className={styles.variableBarLeft}>
                                <span className={styles.variableLabel}>Insert variable:</span>
                                <select
                                    className={styles.variableSelect}
                                    value={selectedVariable}
                                    onChange={(e) => handleVariableSelect(e.target.value)}
                                >
                                    <option value="">Select variable to insert...</option>
                                    {fields.map(field => (
                                        <option key={field.id} value={field.name}>
                                            {`{{${field.name}}}`}
                                        </option>
                                    ))}
                                </select>

                                <button
                                    className={styles.createFieldBtn}
                                    onClick={() => setShowNewFieldInput(true)}
                                >
                                    <PlusIcon className={styles.smallIcon} />
                                    Create new variable
                                </button>
                            </div>

                            <button className={styles.attachBtn}>
                                <PaperclipIcon className={styles.icon} />
                                Attachment
                            </button>
                        </div>

                        {/* Editor */}
                        <div className={styles.editorContainer}>
                            <MailEditor
                                ref={mailEditorRef}
                                content={content}
                                onContentChange={setContent}
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* Preview Modal */}
            <PreviewModal
                isOpen={isPreviewModalOpen}
                onClose={() => setIsPreviewModalOpen(false)}
                content={content}
                subject={campaignSubject}
                recipients={recipients}
                fields={fields}
                previewIndex={previewIndex}
                onPreviewIndexChange={setPreviewIndex}
                onSend={onSendEmails}
            />

            {/* New Variable Modal */}
            {showNewFieldInput && (
                <div className={styles.modalOverlay} onClick={() => { setShowNewFieldInput(false); setNewFieldName(''); }}>
                    <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                        <div className={styles.modalHeader}>
                            <h3 className={styles.modalTitle}>Add new variable</h3>
                            <button
                                className={styles.modalCloseBtn}
                                onClick={() => { setShowNewFieldInput(false); setNewFieldName(''); }}
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className={styles.modalBody}>
                            <label className={styles.modalLabel}>Variable name:</label>
                            <input
                                type="text"
                                placeholder="Variable name"
                                value={newFieldName}
                                onChange={(e) => setNewFieldName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateNewField();
                                    if (e.key === 'Escape') {
                                        setShowNewFieldInput(false);
                                        setNewFieldName('');
                                    }
                                }}
                                className={styles.modalInput}
                                autoFocus
                            />
                        </div>
                        <div className={styles.modalFooter}>
                            <button
                                className={styles.modalCancelBtn}
                                onClick={() => { setShowNewFieldInput(false); setNewFieldName(''); }}
                            >
                                Cancel
                            </button>
                            <button
                                className={styles.modalConfirmBtn}
                                onClick={handleCreateNewField}
                                disabled={!newFieldName.trim()}
                            >
                                Add
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Recipients Modal */}
            <RecipientsModal
                isOpen={isRecipientsModalOpen}
                onClose={() => setIsRecipientsModalOpen(false)}
                recipients={recipients}
                fields={fields}
                onSave={(newRecipients, newFields) => {
                    setRecipients(newRecipients);
                    setFields(newFields);
                }}
            />
        </div>
    );
};

export default EmailTemplate;
