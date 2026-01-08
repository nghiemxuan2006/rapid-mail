import { useState } from 'react';
import styles from './FieldsTab.module.scss';
import type { Field } from '@/pages/email-template/EmailTemplate';

interface FieldsTabProps {
    fields: Field[];
    onInsert: (fieldName: string) => void;
    onAddField: (fieldName: string) => void;
    onDeleteField: (fieldId: string) => void;
}

const FieldsTab = ({
    fields,
    onInsert,
    onAddField,
    onDeleteField,
}: FieldsTabProps) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [newFieldName, setNewFieldName] = useState('');
    const [showAddForm, setShowAddForm] = useState(false);

    const filteredFields = fields.filter((field) =>
        field.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleAddField = () => {
        if (newFieldName.trim()) {
            onAddField(newFieldName.trim());
            setNewFieldName('');
            setShowAddForm(false);
        }
    };

    const handleInsertVariable = (fieldName: string) => {
        // Call the insertVariable function exposed by MailEditor
        (window as any).insertVariable?.(fieldName);
        onInsert(fieldName);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleAddField();
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.searchBox}>
                <input
                    type="text"
                    placeholder="Search fields..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={styles.searchInput}
                />
            </div>

            <div className={styles.fieldsList}>
                {filteredFields.length > 0 ? (
                    filteredFields.map((field) => (
                        <div key={field.id} className={styles.fieldItem}>
                            <span className={styles.fieldTag}>[{field.name}]</span>
                            <div className={styles.fieldActions}>
                                <button
                                    className={styles.insertBtn}
                                    onClick={() => handleInsertVariable(field.name)}
                                    title="Insert into email content"
                                >
                                    +
                                </button>
                                <button
                                    className={styles.deleteBtn}
                                    onClick={() => onDeleteField(field.id)}
                                    title="Delete field"
                                >
                                    ✕
                                </button>
                            </div>
                        </div>
                    ))
                ) : (
                    <div className={styles.empty}>
                        {searchTerm
                            ? 'No fields found matching your search'
                            : 'No fields available'}
                    </div>
                )}
            </div>

            <div className={styles.addFieldSection}>
                {!showAddForm ? (
                    <button
                        className={styles.addBtn}
                        onClick={() => setShowAddForm(true)}
                    >
                        + Add New Field
                    </button>
                ) : (
                    <div className={styles.addForm}>
                        <input
                            type="text"
                            placeholder="Field name (e.g., Company, Phone)"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            onKeyPress={handleKeyPress}
                            className={styles.fieldInput}
                            autoFocus
                        />
                        <div className={styles.formActions}>
                            <button
                                className={styles.confirmBtn}
                                onClick={handleAddField}
                            >
                                Add
                            </button>
                            <button
                                className={styles.cancelBtn}
                                onClick={() => {
                                    setShowAddForm(false);
                                    setNewFieldName('');
                                }}
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className={styles.hint}>
                <strong>💡 Tip:</strong> Click <strong>+</strong> to insert a field into your email, or
                click <strong>✕</strong> to remove it.
            </div>
        </div>
    );
};

export default FieldsTab;
