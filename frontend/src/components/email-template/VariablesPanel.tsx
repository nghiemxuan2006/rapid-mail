import { useState } from 'react';
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
        <div className="flex flex-col h-full bg-card overflow-hidden">
            {/* Header */}
            <div className="shrink-0 px-5 py-4 border-b border-border bg-muted/50">
                <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold text-foreground">Variables</h3>
                        <Tooltip title="Click Fields tab to insert variables">
                            <div className="flex items-center justify-center w-5 h-5 cursor-help text-muted-foreground hover:text-foreground">
                                <InfoIcon />
                            </div>
                        </Tooltip>
                    </div>
                    {onClose && (
                        <button
                            className="bg-transparent border-none text-muted-foreground cursor-pointer p-1 px-2 hover:text-foreground"
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
            <div className="flex-1 min-h-0 overflow-hidden">
                <div className="h-full overflow-y-auto overflow-x-hidden py-3">
                    {fields.map(field => {
                        const stats = getFieldStats(field.name);
                        const isEmail = isEmailField(field.name);
                        return (
                            <div
                                key={field.id}
                                className="relative flex items-center px-5 py-2 cursor-pointer hover:bg-accent/50 group"
                            >
                                <div
                                    className="flex-1 flex justify-between items-center"
                                    onClick={() => onInsert(field.name)}
                                >
                                    <span className="text-sm text-foreground font-medium flex items-center gap-2">
                                        {field.name}
                                        {isEmail && <span className="text-[0.7rem] text-primary bg-primary/10 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">Required</span>}
                                    </span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-primary font-semibold bg-primary/10 px-1.5 py-0.5 rounded">
                                            {stats.percentage}%
                                        </span>
                                    </div>
                                </div>
                                {!isEmail && (
                                    <button
                                        className="opacity-0 group-hover:opacity-100 bg-transparent border-none text-muted-foreground cursor-pointer p-0 px-1 ml-2 hover:text-destructive"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (window.confirm(`Delete field "${field.name}"?`)) {
                                                onDeleteField(field.id);
                                            }
                                        }}
                                        title="Delete field"
                                    >
                                        <TrashIcon className="w-4 h-4" />
                                    </button>
                                )}
                                <div className="hidden group-hover:block absolute left-full top-1/2 -translate-y-1/2 bg-foreground text-background px-3 py-2 rounded-md text-xs whitespace-nowrap z-10 ml-2 shadow-lg">
                                    <div>Data: {stats.filledCount}/{stats.totalRecipients}</div>
                                    {stats.missing > 0 && (
                                        <div className="text-yellow-300 mt-1">Missing: {stats.missing}</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Footer - Add New Field */}
            <div className="shrink-0 px-5 py-4 border-t border-border bg-muted/30">
                <div className="flex gap-2">
                    <input
                        type="text"
                        value={newFieldName}
                        onChange={(e) => setNewFieldName(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleAddField()}
                        placeholder="New field name..."
                        className="flex-1 py-2 px-3 border border-border rounded bg-card text-sm focus:outline-none focus:border-ring focus:ring-2 focus:ring-ring/50"
                    />
                    <button
                        onClick={handleAddField}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded text-sm font-semibold hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
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
