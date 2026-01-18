import type { Field } from '@/pages/email-template/EmailTemplate';
import styles from './RecipientsModal.module.scss';
import { ContactsIcon, DuplicateIcon } from '@/assets/icons';
import type { Recipient } from '@/schema/campaign';

interface RecipientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipients: Recipient[];
    fields: Field[];
    onUpdateRecipient: (recipientId: string, fieldName: string, value: string) => void;
    onAddRecipient: () => void;
    onDeleteRecipient: (recipientId: string) => void;
}

const RecipientsModal = ({
    isOpen,
    onClose,
    recipients,
    fields,
    onUpdateRecipient,
    onAddRecipient,
    onDeleteRecipient
}: RecipientsModalProps) => {
    if (!isOpen) return null;

    const getCompletionPercentage = (recipient: Recipient) => {
        const totalFields = fields.length;
        if (totalFields === 0) return 100;

        const filledFields = fields.filter(f => recipient[f.name] && recipient[f.name].trim() !== '').length;
        return Math.round((filledFields / totalFields) * 100);
    };

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <div>
                        <h2>Manage Recipients</h2>
                        <p className={styles.subtitle}>
                            {recipients.length} recipient{recipients.length !== 1 ? 's' : ''} • {fields.length} field{fields.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.actions}>
                    <button className={styles.addBtn} onClick={onAddRecipient}>
                        <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Add Recipient
                    </button>
                    <button className={styles.bulkBtn}>
                        <DuplicateIcon className={styles.icon} />
                        Bulk Paste
                    </button>
                    <button className={styles.importBtn}>
                        <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                        </svg>
                        Import CSV
                    </button>
                </div>

                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.statusCol}>Status</th>
                                {fields.map(field => (
                                    <th key={field.id}>{field.name}</th>
                                ))}
                                <th className={styles.actionCol}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {recipients.map((recipient) => {
                                const completion = getCompletionPercentage(recipient);
                                return (
                                    <tr key={recipient.id}>
                                        <td className={styles.statusCol}>
                                            <div className={styles.completionBadge}>
                                                <div
                                                    className={styles.completionBar}
                                                    style={{
                                                        width: `${completion}%`,
                                                        background: completion === 100 ? '#4caf50' :
                                                            completion >= 50 ? '#ff9800' : '#f44336'
                                                    }}
                                                />
                                                <span className={styles.completionText}>{completion}%</span>
                                            </div>
                                        </td>
                                        {fields.map(field => {
                                            const value = recipient[field.name] || '';
                                            const isEmpty = !value.trim();
                                            return (
                                                <td key={field.id} className={isEmpty ? styles.emptyCell : ''}>
                                                    <input
                                                        type="text"
                                                        value={value}
                                                        onChange={(e) => onUpdateRecipient(recipient.id, field.name, e.target.value)}
                                                        className={styles.cellInput}
                                                        placeholder={`Enter ${field.name.toLowerCase()}`}
                                                    />
                                                </td>
                                            );
                                        })}
                                        <td className={styles.actionCol}>
                                            <button
                                                className={styles.deleteRowBtn}
                                                onClick={() => {
                                                    if (window.confirm('Delete this recipient?')) {
                                                        onDeleteRecipient(recipient.id);
                                                    }
                                                }}
                                                title="Delete recipient"
                                            >
                                                <svg className={styles.deleteIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                                </svg>
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {recipients.length === 0 && (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <ContactsIcon className={styles.emptyIconSvg} />
                        </div>
                        <div className={styles.emptyText}>No recipients yet</div>
                        <div className={styles.emptyHint}>Click "Add Recipient" to get started</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipientsModal;
