import type { Field, Recipient } from '@/pages/email-template/EmailTemplate';
import styles from './RecipientsModal.module.scss';

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
                        + Add Recipient
                    </button>
                    <button className={styles.bulkBtn}>
                        📋 Bulk Paste
                    </button>
                    <button className={styles.importBtn}>
                        📥 Import CSV
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
                                                🗑️
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
                        <div className={styles.emptyIcon}>👥</div>
                        <div className={styles.emptyText}>No recipients yet</div>
                        <div className={styles.emptyHint}>Click "Add Recipient" to get started</div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default RecipientsModal;
