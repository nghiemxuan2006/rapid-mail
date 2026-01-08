import styles from './RecipientsTab.module.scss';
import type { Field, Recipient } from '@/pages/email-template/EmailTemplate';

interface RecipientsTabProps {
    recipients: Recipient[];
    fields: Field[];
    onUpdateRecipient: (recipientId: string, fieldName: string, value: string) => void;
    onAddRecipient: () => void;
    onDeleteRecipient: (recipientId: string) => void;
}

const RecipientsTab = ({
    recipients,
    fields,
    onUpdateRecipient,
    onAddRecipient,
    onDeleteRecipient,
}: RecipientsTabProps) => {
    if (fields.length === 0) {
        return (
            <div className={styles.container}>
                <div className={styles.emptyState}>
                    <p>No fields defined yet.</p>
                    <p>Go to <strong>Fields</strong> tab to create your first field.</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.tableWrapper}>
                <table className={styles.table}>
                    <thead>
                        <tr>
                            <th className={styles.actionCol}>Action</th>
                            {fields.map((field) => (
                                <th key={field.id}>{field.name}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {recipients.map((recipient) => (
                            <tr key={recipient.id} className={styles.row}>
                                <td className={styles.actionCol}>
                                    <button
                                        className={styles.deleteRowBtn}
                                        onClick={() => onDeleteRecipient(recipient.id)}
                                        title="Delete recipient"
                                    >
                                        ✕
                                    </button>
                                </td>
                                {fields.map((field) => (
                                    <td key={field.id}>
                                        <input
                                            type="text"
                                            value={recipient[field.name] || ''}
                                            onChange={(e) =>
                                                onUpdateRecipient(recipient.id, field.name, e.target.value)
                                            }
                                            className={styles.cellInput}
                                            placeholder={`Enter ${field.name.toLowerCase()}`}
                                        />
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <div className={styles.actions}>
                <button className={styles.addRowBtn} onClick={onAddRecipient}>
                    + Add Recipient
                </button>
            </div>

            <div className={styles.info}>
                <strong>Total Recipients:</strong> {recipients.length}
            </div>
        </div>
    );
};

export default RecipientsTab;
