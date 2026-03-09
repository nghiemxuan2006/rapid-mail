import React from 'react';
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll';
import type { Field } from '@/pages/email-template/EmailTemplate';
import { ContactsIcon } from '@/assets/icons';
import type { Recipient } from '@/schema/campaign';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Upload, Save, Trash2, X } from 'lucide-react';

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
    const fileInputRef = React.useRef<HTMLInputElement>(null);

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

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            parseCSV(text);
        };
        reader.readAsText(file);

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) return;

        const headers = lines[0].split(',').map(h => h.trim());
        const emailIndex = headers.findIndex(h => h.toLowerCase() === 'email');

        if (emailIndex === -1) return;

        const newFields: Field[] = [];
        headers.forEach((header, index) => {
            if (index !== emailIndex && header) {
                const exists = localFields.some(f => f.name.toLowerCase() === header.toLowerCase());
                if (!exists) {
                    newFields.push({ id: `csv-${Date.now()}-${index}`, name: header });
                }
            }
        });

        const newRecipients: Recipient[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            const email = values[emailIndex] || '';
            if (email) {
                const recipient: Recipient = { id: `${Date.now()}-${i}`, Email: email };
                headers.forEach((header, index) => {
                    if (index !== emailIndex && header) {
                        recipient[header] = values[index] || '';
                    }
                });
                newRecipients.push(recipient);
            }
        }

        setLocalFields(prev => [...prev, ...newFields]);
        setLocalRecipients(prev => [...prev, ...newRecipients]);
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

    const handleSelectAll = (checked: boolean) => {
        if (checked) {
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
    const someSelected = selectedRows.size > 0;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
            <div className="bg-background rounded-lg border shadow-lg w-[95vw] max-w-300 max-h-[80vh] flex flex-col p-6 gap-6" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div className="space-y-1">
                        <h2 className="text-lg font-semibold leading-none">Manage Recipients</h2>
                        <p className="text-sm text-muted-foreground">
                            {localRecipients.filter(r => localFields.some(f => (r[f.name] || '').trim() !== '')).length} recipients • {localFields.length} fields
                        </p>
                    </div>
                    <button
                        className="rounded-xs opacity-70 transition-opacity hover:opacity-100 focus:outline-hidden"
                        onClick={onClose}
                    >
                        <X className="size-4" />
                        <span className="sr-only">Close</span>
                    </button>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-2">
                        <Button onClick={handleAddRecipient} size="sm">
                            <Plus className="size-4 mr-2" />
                            Add Recipient
                        </Button>
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            size="sm"
                        >
                            <Upload className="size-4 mr-2" />
                            Import CSV
                        </Button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept=".csv"
                            onChange={handleFileUpload}
                            className="hidden"
                        />
                        {someSelected && (
                            <Button
                                onClick={handleDeleteSelected}
                                variant="outline"
                                size="sm"
                            >
                                <Trash2 className="size-4 mr-2" />
                                Delete Selected
                            </Button>
                        )}
                    </div>

                    <div className="flex gap-2 items-center">
                        <Input
                            placeholder="Enter new variable name"
                            value={newFieldName}
                            onChange={(e) => setNewFieldName(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
                            className="w-56"
                        />
                        <Button onClick={handleAddField} size="sm">
                            <Plus className="size-4 mr-2" />
                            Add Variable
                        </Button>
                    </div>
                </div>

                {/* Table */}
                <div className="flex-1 overflow-auto min-h-0">
                    {localRecipients.length > 0 ? (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-linear-to-r from-primary/5 via-primary/10 to-primary/5 hover:bg-linear-to-r border-b-2 border-primary/20">
                                        <TableHead className="w-12 py-4">
                                            <Checkbox
                                                checked={isAllSelected}
                                                onCheckedChange={handleSelectAll}
                                                className="border-2"
                                            />
                                        </TableHead>
                                        <TableHead className="w-20 font-bold text-xs uppercase tracking-wider py-4">
                                            STT
                                        </TableHead>
                                        {localFields.map(field => (
                                            <TableHead key={field.id} className="min-w-50 font-bold text-xs uppercase tracking-wider py-4">
                                                <div className="flex items-center justify-between gap-2">
                                                    <span>{field.name.toUpperCase()}</span>
                                                    {field.name.toLowerCase() !== 'email' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="size-7 p-0 shrink-0 rounded-full hover:bg-red-100 hover:text-red-600 dark:hover:bg-red-950 transition-colors"
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
                                                        >
                                                            <X className="size-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableHead>
                                        ))}
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {localRecipients.map((recipient, index) => (
                                        <TableRow
                                            key={recipient.id}
                                            className={`
                                                transition-all duration-150
                                                hover:bg-primary/5 hover:shadow-sm
                                                ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'}
                                                ${recipient.id && selectedRows.has(recipient.id) ? 'bg-primary/10 hover:bg-primary/15' : ''}
                                            `}
                                        >
                                            <TableCell className="py-3">
                                                <Checkbox
                                                    checked={selectedRows.has(recipient.id)}
                                                    onCheckedChange={() => handleSelectRow(recipient.id)}
                                                    className="border-2"
                                                />
                                            </TableCell>
                                            <TableCell className="text-center font-medium text-muted-foreground py-3">
                                                {index + 1}
                                            </TableCell>
                                            {localFields.map(field => {
                                                const value = recipient[field.name] || '';
                                                const isInvalid = invalidCells.has(`${recipient.id}:${field.name}`);
                                                return (
                                                    <TableCell key={field.id} className="py-3">
                                                        <Input
                                                            value={value}
                                                            onChange={(e) => handleRecipientFieldChange(recipient.id, field.name, e.target.value)}
                                                            placeholder={`Enter ${field.name.toLowerCase()}`}
                                                            className={
                                                                isInvalid
                                                                    ? 'border-red-500 focus-visible:ring-red-500 bg-red-50 dark:bg-red-950/20'
                                                                    : 'border-0 shadow-none focus-visible:ring-1 bg-transparent hover:bg-background/50 transition-colors'
                                                            }
                                                        />
                                                    </TableCell>
                                                );
                                            })}
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center p-12 text-center">
                            <ContactsIcon className="w-12 h-12 text-border mb-3" />
                            <div className="text-sm font-semibold text-muted-foreground mb-1">No recipients yet</div>
                            <div className="text-sm text-muted-foreground">Click "Add Recipient" to get started</div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end">
                    <Button onClick={handleSave}>
                        <Save className="size-4 mr-2" />
                        Save
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default RecipientsModal;
