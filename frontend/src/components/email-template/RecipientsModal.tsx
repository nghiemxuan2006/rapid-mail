import React from 'react';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { BaseModal } from '@/components/ui/base-modal';
import type { Field } from '@/pages/email-template/EmailTemplate';
import { ContactsIcon } from '@/assets/icons';
import { type Recipient, validateRecipients } from '@/schema/campaign';
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
import { Plus, Upload, Save, Trash2, X, Info, Download, AlertCircle } from 'lucide-react';
import { showNotifications } from '@/utils/showNotification';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

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
    const [validationErrors, setValidationErrors] = React.useState<{
        [recipientId: string]: { [fieldName: string]: string | undefined };
    }>({});
    const fileInputRef = React.useRef<HTMLInputElement>(null);

    React.useEffect(() => {
        if (isOpen) {
            setLocalFields([...fields]);
            setLocalRecipients(recipients.length > 0 ? [...recipients] : [createEmptyRecipient(fields)]);
            setSelectedRows(new Set());
            setValidationErrors({});
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
        if (validationErrors[recipientId]?.[fieldName] && value.trim()) {
            setValidationErrors(prev => {
                const next = { ...prev };
                if (next[recipientId]) {
                    const { [fieldName]: _, ...rest } = next[recipientId];
                    if (Object.keys(rest).length === 0) delete next[recipientId];
                    else next[recipientId] = rest;
                }
                return next;
            });
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
        if (!file.name.endsWith('.csv')) {
            showNotifications('error', 'File không hợp lệ. Chỉ chấp nhận file .csv');
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (!text || !text.trim()) {
                showNotifications('error', 'File CSV rỗng, không có dữ liệu để đọc.');
                return;
            }
            parseCSV(text);
        };
        reader.onerror = () => showNotifications('error', 'Không thể đọc file. Vui lòng thử lại.');
        reader.readAsText(file);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const parseCSV = (text: string) => {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length === 0) { showNotifications('error', 'File CSV rỗng.'); return; }

        const headers = lines[0].split(',').map(h => h.trim());
        const emailIndex = headers.findIndex(h => h === 'Email');
        if (emailIndex === -1) {
            showNotifications('error', 'File CSV thiếu cột "Email". Header phải có đúng tên "Email" (phân biệt chữ hoa/thường).');
            return;
        }
        if (lines.length < 2) { showNotifications('error', 'File CSV không có dữ liệu (chỉ có header).'); return; }

        const csvFields: Field[] = [];
        headers.forEach((header, index) => {
            if (index !== emailIndex && header)
                csvFields.push({ id: `csv-${Date.now()}-${index}`, name: header });
        });

        const newRecipients: Recipient[] = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.trim());
            if (values.length !== headers.length) {
                showNotifications('error', `Dòng ${i + 1} không khớp cấu trúc header.`);
                return;
            }
            const email = values[emailIndex] || '';
            if (email) {
                const recipient: Recipient = { id: `${Date.now()}-${i}`, Email: email };
                headers.forEach((header, index) => {
                    if (index !== emailIndex && header) recipient[header] = values[index] || '';
                });
                newRecipients.push(recipient);
            }
        }

        if (newRecipients.length === 0) {
            showNotifications('error', 'Không tìm thấy dòng nào có giá trị Email hợp lệ.');
            return;
        }

        const emailField = localFields.find(f => f.name === 'Email') ?? { id: `csv-email-${Date.now()}`, name: 'Email' };
        setLocalFields([emailField, ...csvFields]);
        setLocalRecipients(newRecipients);
    };

    const handleSave = async () => {
        const filled = localRecipients.filter(recipient =>
            localFields.some(field => (recipient[field.name] || '').trim() !== '')
        );
        const fieldNames = localFields.map(f => f.name);
        const { errors, hasErrors } = await validateRecipients(filled, fieldNames);
        if (hasErrors) {
            setValidationErrors(errors);
            showNotifications('error', 'Please fix validation errors before saving');
            return;
        }
        setValidationErrors({});
        onSave(filled, localFields);
        onClose();
    };

    const handleAddField = () => {
        if (newFieldName.trim()) {
            const newField: Field = { id: Date.now().toString(), name: newFieldName };
            setLocalFields(prev => [...prev, newField]);
            setLocalRecipients(prev => prev.map(r => ({ ...r, [newFieldName]: '' })));
            setNewFieldName('');
        }
    };

    const handleSelectAll = (checked: boolean) => {
        setSelectedRows(checked ? new Set(localRecipients.map(r => r.id)) : new Set());
    };

    const handleSelectRow = (recipientId: string) => {
        const next = new Set(selectedRows);
        next.has(recipientId) ? next.delete(recipientId) : next.add(recipientId);
        setSelectedRows(next);
    };

    const isAllSelected = localRecipients.length > 0 && selectedRows.size === localRecipients.length;
    const someSelected = selectedRows.size > 0;

    return (
        <BaseModal open={isOpen} onOpenChange={(open) => !open && onClose()} size="fullscreen">
            <DialogHeader className="shrink-0 space-y-1 px-6 pt-6 pb-2">
                <DialogTitle>Manage Recipients</DialogTitle>
                <p className="text-sm text-muted-foreground">
                    {localRecipients.filter(r => localFields.some(f => (r[f.name] || '').trim() !== '')).length} recipients • {localFields.length} fields
                </p>
            </DialogHeader>

            <div className="flex-1 overflow-hidden flex flex-col px-6 py-4 gap-4">
                {/* Actions */}
                <div className="flex items-center justify-between gap-4 flex-wrap">
                    <div className="flex gap-2">
                        <Button onClick={handleAddRecipient} size="sm">
                            <Plus className="size-4 mr-2" />
                            Add Recipient
                        </Button>
                        <div className="relative">
                            <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm">
                                <Upload className="size-4 mr-2" />
                                Import CSV
                            </Button>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <button
                                        type="button"
                                        aria-label="CSV Import Guide"
                                        className="absolute -top-2 -right-2 size-5 rounded-full bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground flex items-center justify-center transition-all hover:scale-110 shadow-md border-2 border-background z-10"
                                    >
                                        <Info className="size-3.5" />
                                    </button>
                                </PopoverTrigger>
                                <PopoverContent className="w-105 p-0 border-primary/20" align="start" side="bottom" sideOffset={8}>
                                    <Alert className="border-0 bg-muted/50 rounded-md">
                                        <AlertDescription className="space-y-3">
                                            <div>
                                                <h4 className="font-semibold text-sm mb-2">📋 Required CSV Structure:</h4>
                                                <ul className="text-xs space-y-1 text-muted-foreground">
                                                    <li>• <strong className="text-foreground">First row</strong> must contain column headers</li>
                                                    <li>• <strong className="text-foreground">Required column:</strong> "Email" (phân biệt hoa thường)</li>
                                                    <li>• Additional columns become custom variables automatically</li>
                                                    <li>• Use comma (,) as delimiter</li>
                                                </ul>
                                            </div>
                                            <div className="border-t border-border pt-3">
                                                <h4 className="font-semibold text-sm mb-2">📝 Example CSV Format:</h4>
                                                <div className="bg-background rounded-md p-3 border border-border">
                                                    <code className="text-xs font-mono block text-foreground/80">
                                                        Email,firstName,lastName,company<br />
                                                        john@example.com,John,Doe,Acme Inc<br />
                                                        jane@example.com,Jane,Smith,Tech Corp
                                                    </code>
                                                </div>
                                            </div>
                                            <div className="border-t border-border pt-3">
                                                <h4 className="font-semibold text-sm mb-2">💡 Tips:</h4>
                                                <ul className="text-xs space-y-1 text-muted-foreground">
                                                    <li>• Export from Excel/Google Sheets as CSV</li>
                                                    <li>• Ensure no special characters in headers</li>
                                                    <li>• Upload sẽ thay thế toàn bộ dữ liệu hiện tại</li>
                                                </ul>
                                            </div>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="w-full mt-2"
                                                onClick={() => {
                                                    const sampleCSV = 'Email,firstName,lastName,company\njohn@example.com,John,Doe,Acme Inc\njane@example.com,Jane,Smith,Tech Corp';
                                                    const blob = new Blob([sampleCSV], { type: 'text/csv' });
                                                    const url = URL.createObjectURL(blob);
                                                    const a = document.createElement('a');
                                                    a.href = url;
                                                    a.download = 'sample-recipients.csv';
                                                    a.click();
                                                    URL.revokeObjectURL(url);
                                                    showNotifications('success', 'Sample CSV downloaded!');
                                                }}
                                            >
                                                <Download className="size-4 mr-2" />
                                                Download Sample CSV
                                            </Button>
                                        </AlertDescription>
                                    </Alert>
                                </PopoverContent>
                            </Popover>
                        </div>
                        <input ref={fileInputRef} type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
                        {someSelected && (
                            <Button onClick={handleDeleteSelected} variant="outline" size="sm">
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
                <div className="flex-1 overflow-auto">
                    {localRecipients.length > 0 ? (
                        <div className="rounded-lg border overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-linear-to-r from-primary/5 via-primary/10 to-primary/5 hover:bg-linear-to-r border-b-2 border-primary/20">
                                        <TableHead className="w-12 py-4 border-r align-middle">
                                            <div className="flex items-center justify-center">
                                                <Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} className="border-2" />
                                            </div>
                                        </TableHead>
                                        {localFields.map(field => (
                                            <TableHead key={field.id} className={`${field.name.toLowerCase() === 'email' ? 'min-w-64' : 'min-w-52'} font-bold text-xs uppercase tracking-wider py-4 border-r align-middle`}>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="flex-1 text-center">{field.name.toUpperCase()}</span>
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
                                            className={`transition-all duration-150 hover:bg-primary/5 hover:shadow-sm ${index % 2 === 0 ? 'bg-muted/30' : 'bg-background'} ${selectedRows.has(recipient.id) ? 'bg-primary/10 hover:bg-primary/15' : ''}`}
                                        >
                                            <TableCell className="py-3 border-r border-dashed align-middle">
                                                <div className="flex items-center justify-center">
                                                    <Checkbox checked={selectedRows.has(recipient.id)} onCheckedChange={() => handleSelectRow(recipient.id)} className="border-2" />
                                                </div>
                                            </TableCell>
                                            {localFields.map(field => {
                                                const value = recipient[field.name] || '';
                                                const errorMsg = validationErrors[recipient.id]?.[field.name];
                                                return (
                                                    <TableCell key={field.id} className="py-3 border-r border-dashed align-middle">
                                                        <div className="relative">
                                                            <Input
                                                                value={value}
                                                                onChange={(e) => handleRecipientFieldChange(recipient.id, field.name, e.target.value)}
                                                                placeholder={`Enter ${field.name.toLowerCase()}`}
                                                                className={errorMsg
                                                                    ? 'border-2 border-destructive focus-visible:ring-0 focus-visible:ring-offset-0 focus-visible:border-destructive bg-destructive/10 pr-10'
                                                                    : 'border-0 shadow-none focus-visible:ring-1 bg-transparent hover:bg-background/50 transition-colors'
                                                                }
                                                            />
                                                            {errorMsg && (
                                                                <Tooltip>
                                                                    <TooltipTrigger asChild>
                                                                        <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                                                            <AlertCircle className="size-5 text-destructive cursor-help" />
                                                                        </div>
                                                                    </TooltipTrigger>
                                                                    <TooltipContent side="right" sideOffset={8} className="max-w-70">
                                                                        <div className="space-y-1">
                                                                            <p className="font-semibold">Validation Error</p>
                                                                            <p className="opacity-90">{errorMsg}</p>
                                                                        </div>
                                                                    </TooltipContent>
                                                                </Tooltip>
                                                            )}
                                                        </div>
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
                <div className="flex justify-end pt-4">
                    <Button onClick={handleSave}>
                        <Save className="size-4 mr-2" />
                        Save
                    </Button>
                </div>
            </div>
        </BaseModal>
    );
};

export default RecipientsModal;
