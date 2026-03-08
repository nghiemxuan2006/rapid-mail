import React from 'react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { Field } from '@/pages/email-template/EmailTemplate';
import styles from './RecipientsModal.module.scss';
import { ContactsIcon } from '@/assets/icons';
import type { Recipient } from '@/schema/campaign';
import {
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Checkbox,
} from '@mui/material';

interface RecipientsModalProps {
    isOpen: boolean;
    onClose: () => void;
    recipients: Recipient[];
    fields: Field[];
    onSave: (recipients: Recipient[], fields: Field[]) => void;
}

const createEmptyRecipient = (fields: Field[]): Recipient => {
    const recipient: Recipient = { id: Date.now().toString(), Email: '' };
    fields.forEach(f => { recipient[f.name] = ''; });
    return recipient;
};

const RecipientsModal = ({
    isOpen,
    onClose,
    recipients,
    fields,
    onSave,
}: RecipientsModalProps) => {
    useLockBodyScroll(isOpen);
    const [localRecipients, setLocalRecipients] = React.useState<Recipient[]>([]);
    const [localFields, setLocalFields] = React.useState<Field[]>([]);
    const [newFieldName, setNewFieldName] = React.useState('');
    const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());
    const [invalidCells, setInvalidCells] = React.useState<Set<string>>(new Set());

    React.useEffect(() => {
        if (isOpen) {
            setLocalFields([...fields]);
            setLocalRecipients(recipients.length > 0 ? [...recipients] : [createEmptyRecipient(fields)]);
            setSelectedRows(new Set());
            setInvalidCells(new Set());
            setNewFieldName('');
        }
    }, [isOpen]);

    React.useEffect(() => {
        if (!isOpen || localRecipients.length === 0) return;

        const allComplete = localRecipients.every(recipient =>
            localFields.every(field => (recipient[field.name] || '').trim() !== '')
        );

        if (allComplete) {
            setLocalRecipients(prev => [...prev, createEmptyRecipient(localFields)]);
        }
    }, [isOpen, localRecipients, localFields]);

    const handleRecipientFieldChange = (recipientId: string, fieldName: string, value: string) => {
        setLocalRecipients(prev =>
            prev.map(r => r.id === recipientId ? { ...r, [fieldName]: value } : r)
        );
        if (invalidCells.size > 0) {
            const key = `${recipientId}:${fieldName}`;
            if (invalidCells.has(key) && value.trim()) {
                setInvalidCells(prev => {
                    const next = new Set(prev);
                    next.delete(key);
                    return next;
                });
            }
        }
    };

    const handleAddRecipient = () => {
        setLocalRecipients(prev => [...prev, createEmptyRecipient(localFields)]);
    };

    const handleDeleteSelected = () => {
        if (selectedRows.size === 0) return;
        if (window.confirm(`Delete ${selectedRows.size} recipient(s)?`)) {
            setLocalRecipients(prev => prev.filter(r => !selectedRows.has(r.id)));
            setSelectedRows(new Set());
        }
    };

    const handleSave = () => {
        const filled = localRecipients.filter(recipient =>
            localFields.some(field => (recipient[field.name] || '').trim() !== '')
        );

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const errors = new Set<string>();
        filled.forEach(recipient => {
            localFields.forEach(field => {
                const value = (recipient[field.name] || '').trim();
                if (!value) {
                    errors.add(`${recipient.id}:${field.name}`);
                } else if (field.name.toLowerCase() === 'email' && !emailRegex.test(value)) {
                    errors.add(`${recipient.id}:${field.name}`);
                }
            });
        });

        if (errors.size > 0) {
            setInvalidCells(errors);
            return;
        }

        onSave(filled, localFields);
        onClose();
    };

    if (!isOpen) return null;

    const handleAddField = () => {
        if (newFieldName.trim()) {
            const newField: Field = {
                id: Date.now().toString(),
                name: newFieldName,
            };
            setLocalFields(prev => [...prev, newField]);
            setLocalRecipients(prev =>
                prev.map(r => ({ ...r, [newFieldName]: '' }))
            );
            setNewFieldName('');
        }
    };

    const handleSelectAll = (event: React.ChangeEvent<HTMLInputElement>) => {
        if (event.target.checked) {
            setSelectedRows(new Set(localRecipients.map(r => r.id)));
        } else {
            setSelectedRows(new Set());
        }
    };

    const handleSelectRow = (recipientId: string) => {
        const newSelected = new Set(selectedRows);
        if (newSelected.has(recipientId)) {
            newSelected.delete(recipientId);
        } else {
            newSelected.add(recipientId);
        }
        setSelectedRows(newSelected);
    };

    const isAllSelected = localRecipients.length > 0 && selectedRows.size === localRecipients.length;
    const isPartialSelected = selectedRows.size > 0 && selectedRows.size < localRecipients.length;

    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.title}>Manage Recipients</h2>
                        <p className={styles.subtitle}>
                            {localRecipients.filter(r => localFields.some(f => (r[f.name] || '').trim() !== '')).length} recipients • {localFields.length} fields
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="20" height="20">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Content */}
                <div className={styles.content}>
                    {/* Actions Row */}
                    <div className={styles.actionsRow}>
                        <div className={styles.actionsLeft}>
                            <button className={styles.addBtn} onClick={handleAddRecipient}>
                                <svg className={styles.btnIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Add Recipient
                            </button>
                            <button className={styles.importBtn}>
                                <svg className={styles.btnIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
                                </svg>
                                Import CSV
                            </button>
                            {selectedRows.size > 0 && (
                                <button className={styles.deleteBtn} onClick={handleDeleteSelected}>
                                    Delete {selectedRows.size}
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Add Variable Row */}
                    <div className={styles.fieldRow}>
                        <input
                            type="text"
                            placeholder="Enter new variable name"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
                            className={styles.fieldInput}
                        />
                        <button className={styles.addFieldBtn} onClick={handleAddField} disabled={!newFieldName.trim()}>
                            <svg className={styles.btnIcon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                            </svg>
                            Add Variable
                        </button>
                    </div>

                    {/* Table */}
                    <div className={styles.tableWrapper}>
                        {localRecipients.length > 0 ? (
                            <TableContainer className={styles.tableContainer}>
                                <Table stickyHeader>
                                    <TableHead>
                                        <TableRow>
                                            <TableCell padding="checkbox" className={styles.checkboxCol}>
                                                <Checkbox
                                                    indeterminate={isPartialSelected}
                                                    checked={isAllSelected}
                                                    onChange={handleSelectAll}
                                                    size="small"
                                                    sx={{ color: '#d1d5db', '&.Mui-checked': { color: '#1f2937' } }}
                                                />
                                            </TableCell>
                                            <TableCell className={styles.sttCol}>STT</TableCell>
                                            {localFields.map(field => (
                                                <TableCell key={field.id} className={styles.fieldHeader}>
                                                    <div className={styles.fieldHeaderContent}>
                                                        <span>{field.name.toUpperCase()}</span>
                                                        {field.name.toLowerCase() !== 'email' && (
                                                            <button
                                                                className={styles.deleteFieldBtn}
                                                                onClick={() => {
                                                                    if (window.confirm(`Delete variable "${field.name}"?`)) {
                                                                        setLocalFields(prev => prev.filter(f => f.id !== field.id));
                                                                        setLocalRecipients(prev =>
                                                                            prev.map(r => {
                                                                                const { [field.name]: _, ...rest } = r;
                                                                                return rest as Recipient;
                                                                            })
                                                                        );
                                                                    }
                                                                }}
                                                                title={`Delete ${field.name}`}
                                                            >
                                                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="14" height="14">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                                                                </svg>
                                                            </button>
                                                        )}
                                                    </div>
                                                </TableCell>
                                            ))}
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {localRecipients.map((recipient, index) => (
                                            <TableRow key={recipient.id} className={styles.tableRow}>
                                                <TableCell padding="checkbox" className={styles.checkboxCol}>
                                                    <Checkbox
                                                        checked={selectedRows.has(recipient.id)}
                                                        onChange={() => handleSelectRow(recipient.id)}
                                                        size="small"
                                                        sx={{ color: '#d1d5db', '&.Mui-checked': { color: '#1f2937' } }}
                                                    />
                                                </TableCell>
                                                <TableCell className={styles.sttCol}>{index + 1}</TableCell>
                                                {localFields.map(field => {
                                                    const value = recipient[field.name] || '';
                                                    const isInvalid = invalidCells.has(`${recipient.id}:${field.name}`);
                                                    return (
                                                        <TableCell key={field.id}>
                                                            <input
                                                                type="text"
                                                                value={value}
                                                                onChange={(e) => handleRecipientFieldChange(recipient.id, field.name, e.target.value)}
                                                                className={`${styles.cellInput} ${isInvalid ? styles.invalidInput : ''}`}
                                                                placeholder={`Enter ${field.name.toLowerCase()}`}
                                                            />
                                                        </TableCell>
                                                    );
                                                })}
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <div className={styles.emptyState}>
                                <ContactsIcon className={styles.emptyIcon} />
                                <div className={styles.emptyText}>No recipients yet</div>
                                <div className={styles.emptyHint}>Click "Add Recipient" to get started</div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className={styles.footer}>
                    <button className={styles.saveBtn} onClick={handleSave}>
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" width="16" height="16">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5.25A2.25 2.25 0 0 1 5.25 3h10.19a2.25 2.25 0 0 1 1.59.659l3.31 3.31a2.25 2.25 0 0 1 .66 1.59V18.75A2.25 2.25 0 0 1 18.75 21H5.25A2.25 2.25 0 0 1 3 18.75V5.25Z" />
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 3v4.5h9V3M7.5 15a2.25 2.25 0 1 1 4.5 0 2.25 2.25 0 0 1-4.5 0Z" />
                        </svg>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecipientsModal;
