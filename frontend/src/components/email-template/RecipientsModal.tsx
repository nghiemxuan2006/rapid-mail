import React from 'react';
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
    Button,
    Paper
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
    const [localRecipients, setLocalRecipients] = React.useState<Recipient[]>([]);
    const [localFields, setLocalFields] = React.useState<Field[]>([]);
    const [newFieldName, setNewFieldName] = React.useState('');
    const [selectedRows, setSelectedRows] = React.useState<Set<string>>(new Set());
    const [invalidCells, setInvalidCells] = React.useState<Set<string>>(new Set());

    // Sync local state from parent when modal opens
    React.useEffect(() => {
        if (isOpen) {
            setLocalFields([...fields]);
            setLocalRecipients(recipients.length > 0 ? [...recipients] : [createEmptyRecipient(fields)]);
            setSelectedRows(new Set());
            setInvalidCells(new Set());
            setNewFieldName('');
        }
    }, [isOpen]);

    // Auto-add empty row when all rows are complete
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
        // Clear error for this cell when user types
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
        setLocalRecipients(prev => [...prev, createEmptyRecipient(fields)]);
    };

    const handleDeleteSelected = () => {
        if (selectedRows.size === 0) return;
        if (window.confirm(`Delete ${selectedRows.size} recipient(s)?`)) {
            setLocalRecipients(prev => prev.filter(r => !selectedRows.has(r.id)));
            setSelectedRows(new Set());
        }
    };

    const handleSave = () => {
        // Filter out completely empty rows
        const filled = localRecipients.filter(recipient =>
            localFields.some(field => (recipient[field.name] || '').trim() !== '')
        );

        // Validate: check if any filled row has missing or invalid fields
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
            // Add empty value for the new field to all local recipients
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
                <div className={styles.header}>
                    <div>
                        <h2>Manage Recipients</h2>
                        <p className={styles.subtitle}>
                            {localRecipients.length} recipient{localRecipients.length !== 1 ? 's' : ''} • {localFields.length} field{localFields.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.topSection}>
                        <div className={styles.actions}>
                            <button className={styles.addBtn} onClick={handleAddRecipient}>
                                <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                </svg>
                                Add Recipient
                            </button>
                            <button className={styles.importBtn}>
                                <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                                </svg>
                                Import CSV
                            </button>
                            {selectedRows.size > 0 && (
                                <button className={styles.deleteSelectedBtn} onClick={handleDeleteSelected}>
                                    <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                                    </svg>
                                    Delete {selectedRows.size}
                                </button>
                            )}
                        </div>

                        <div className={styles.fieldActions}>
                            <div className={styles.fieldInput}>
                                <input
                                    type="text"
                                    placeholder="Enter new variable name"
                                    value={newFieldName}
                                    onChange={(e) => setNewFieldName(e.target.value)}
                                    onKeyPress={(e) => e.key === 'Enter' && handleAddField()}
                                    className={styles.fieldInputField}
                                />
                                <button className={styles.addFieldBtn} onClick={handleAddField}>
                                    <svg className={styles.icon} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                                    </svg>
                                    Add Variable
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className={styles.tableWrapper}>
                        <TableContainer component={Paper} className={styles.tableContainer}>
                            <Table stickyHeader>
                                <TableHead>
                                    <TableRow className={styles.tableHeader}>
                                        <TableCell padding="checkbox" className={styles.checkboxCol}>
                                            <Checkbox
                                                indeterminate={isPartialSelected}
                                                checked={isAllSelected}
                                                onChange={handleSelectAll}
                                                sx={{
                                                    color: '#6b7280',
                                                    '&.Mui-checked': {
                                                        color: '#2563eb',
                                                    },
                                                }}
                                            />
                                        </TableCell>
                                        <TableCell className={styles.sttCol}>STT</TableCell>
                                        {localFields.map(field => (
                                            <TableCell key={field.id} className={styles.fieldHeader}>
                                                <div className={styles.fieldHeaderContent}>
                                                    <span>{field.name}</span>
                                                    {field.name.toLowerCase() !== 'email' && (
                                                        <button
                                                            className={styles.deleteFieldBtn}
                                                            onClick={() => {
                                                                if (window.confirm(`Delete variable "${field.name}"?`)) {
                                                                    setLocalFields(prev => prev.filter(f => f.id !== field.id));
                                                                }
                                                            }}
                                                            title="Delete variable"
                                                        >
                                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
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
                                        <TableRow
                                            key={recipient.id}
                                            selected={selectedRows.has(recipient.id)}
                                            className={styles.tableRow}
                                            sx={{
                                                '&.Mui-selected': {
                                                    backgroundColor: 'rgba(37, 99, 235, 0.08)',
                                                },
                                                '&.Mui-selected:hover': {
                                                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                                                },
                                            }}
                                        >
                                            <TableCell padding="checkbox" className={styles.checkboxCol}>
                                                <Checkbox
                                                    checked={selectedRows.has(recipient.id)}
                                                    onChange={() => handleSelectRow(recipient.id)}
                                                    sx={{
                                                        color: '#d1d5db',
                                                        '&.Mui-checked': {
                                                            color: '#2563eb',
                                                        },
                                                    }}
                                                />
                                            </TableCell>
                                            <TableCell className={styles.sttCol}>{index + 1}</TableCell>
                                            {localFields.map(field => {
                                                const value = recipient[field.name] || '';
                                                const isInvalid = invalidCells.has(`${recipient.id}:${field.name}`);
                                                return (
                                                    <TableCell key={field.id} className={isInvalid ? styles.invalidCell : ''}>
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
                    </div>
                </div>

                {localRecipients.length === 0 && (
                    <div className={styles.emptyState}>
                        <div className={styles.emptyIcon}>
                            <ContactsIcon className={styles.emptyIconSvg} />
                        </div>
                        <div className={styles.emptyText}>No recipients yet</div>
                        <div className={styles.emptyHint}>Click "Add Recipient" to get started</div>
                    </div>
                )}

                <div className={styles.footer}>
                    <button className={styles.saveBtn} onClick={handleSave}>
                        Save
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RecipientsModal;
