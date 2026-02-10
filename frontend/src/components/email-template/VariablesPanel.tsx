import { useState } from 'react';
import styles from './VariablesPanel.module.scss';
import { Tooltip } from '@mui/material';
import type { Field } from '@/pages/email-template/EmailTemplate';
import type { Recipient } from '@/schema/campaign';
import { TrashIcon, InfoIcon } from '@/assets/icons';

interface VariablesPanelProps {
    fields: Field[];
    recipients: Recipient[];
    onInsert: (fieldName: string) => void;
    onAddField: (fieldName: string) => void;
    onDeleteField: (fieldId: string) => void;
    onClose?: () => void;
}

const VariablesPanel = ({ fields, recipients, onInsert, onAddField, onDeleteField, onClose }: VariablesPanelProps) => {
    const [newFieldName, setNewFieldName] = useState('');

    const getFieldStats = (fieldName: string) => {
        const totalRecipients = recipients.length;
        const filledCount = recipients.filter(r => r[fieldName] && r[fieldName].trim() !== '').length;
        const percentage = totalRecipients > 0 ? Math.round((filledCount / totalRecipients) * 100) : 0;
        const missing = totalRecipients - filledCount;

        return { filledCount, percentage, missing, totalRecipients };
    };

    const handleAddField = () => {
        if (newFieldName.trim()) {
            onAddField(newFieldName.trim());
            setNewFieldName('');
        }
    };

    const isEmailField = (fieldName: string) => {
        return fieldName.toLowerCase() === 'email';
    };

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerContent}>
                    <div className={styles.titleWrapper}>
                        <h3>Variables</h3>
                        <Tooltip title="Click Fields tab to insert variables">
                            <div className={styles.infoIconWrapper}>
                                <InfoIcon className={styles.infoIcon} />
                            </div>
                        </Tooltip>
                    </div>
                    {onClose && (
                        <button
                            className={styles.closeBtn}
                            onClick={onClose}
                            title="Close Variables Panel"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Body - Variables List */}
            <div className={styles.body}>
                <div className={styles.fieldsList}>
                    {fields.map(field => {
                        const stats = getFieldStats(field.name);
                        const isEmail = isEmailField(field.name);
                        return (
                            <div
                                key={field.id}
                                className={styles.fieldItem}
                            >
                                <div
                                    className={styles.fieldMain}
                                    onClick={() => onInsert(field.name)}
                                >
                                    <span className={styles.fieldName}>
                                        {field.name}
                                        {isEmail && <span className={styles.requiredBadge}>Required</span>}
                                    </span>
                                    <div className={styles.fieldStats}>
                                        <span className={styles.fieldUsage}>
                                            {stats.percentage}%
                                        </span>
                                    </div>
                                </div>
                                {!isEmail && (
                                    <button
                                        className={styles.deleteBtn}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Delete field "${field.name}"?`)) {
                                                onDeleteField(field.id);
                                            }
                                        }}
                                        title="Delete field"
                                    >
                                        <TrashIcon className={styles.trashIcon} />
                                    </button>
                                )}
                                <div className={styles.fieldTooltip}>
                                    <div>Data: {stats.filledCount}/{stats.totalRecipients}</div>
                                    {stats.missing > 0 && (
                                        <div className={styles.warning}>Missing: {stats.missing}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer - Add New Field */}
            <div className={styles.footer}>
                <div className={styles.addField}>
                    <input
                        type="text"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
                        placeholder="New field name..."
                        className={styles.addFieldInput}
                    />
                    <button
                        onClick={handleAddField}
                        className={styles.addFieldBtn}
                        disabled={!newFieldName.trim()}
                    >
                        + Add
                    </button>
                </div>
            </div>
        </div>
    );
};

export default VariablesPanel;
