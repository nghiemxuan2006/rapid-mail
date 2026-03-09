import { useState, useEffect } from 'react';
import TrumbowEditor from '@/components/editor/TrumbowEditor';
import type { Signature } from '@/features/signature/signatureApi';

interface SignatureEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    signature: Signature | null;
    onSave: (updatedSignature: Signature) => void;
    isSaving?: boolean;
}

const SignatureEditModal = ({
    isOpen,
    onClose,
    signature,
    onSave,
    isSaving = false
}: SignatureEditModalProps) => {
    const [editedSignature, setEditedSignature] = useState<Signature | null>(signature);

    // Update editedSignature when signature prop changes
    useEffect(() => {
        if (isOpen && signature) {
            setEditedSignature(signature);
        }
    }, [isOpen, signature?.sendAsEmail]);

    const handleClose = () => {
        onClose();
        setEditedSignature(null);
    };

    const handleSave = () => {
        if (!editedSignature) return;

        const updatedSignature: Signature = {
            ...editedSignature,
            signature: editedSignature.signature,
        };

        onSave(updatedSignature);
        handleClose();
    };

    const handleContentChange = (content: string) => {
        if (editedSignature) {
            setEditedSignature({
                ...editedSignature,
                signature: content,
            });
        }
    };

    if (!isOpen || !editedSignature) return null;

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-1000 animate-in fade-in duration-200"
            onClick={handleClose}
        >
            <div
                className="bg-card rounded-lg shadow-2xl w-[90%] max-w-225 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom-2 duration-300"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex justify-between items-center p-6 border-b border-border">
                    <h2 className="text-xl font-semibold text-foreground">Edit Signature</h2>
                    <button
                        className="bg-transparent border-none text-2xl cursor-pointer text-muted-foreground p-0 w-8 h-8 flex items-center justify-center rounded hover:bg-accent hover:text-foreground disabled:cursor-not-allowed disabled:opacity-50"
                        onClick={handleClose}
                        disabled={isSaving}
                    >
                        ×
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6">
                    <div className="flex flex-col gap-2 flex-1 min-h-100">
                        <label className="text-sm font-medium text-foreground">Signature Content</label>
                        <TrumbowEditor
                            value={editedSignature.signature}
                            onChange={handleContentChange}
                            placeholder="Enter your signature HTML here..."
                        />
                    </div>
                </div>

                <div className="flex justify-end gap-3 p-6 border-t border-border bg-muted/30">
                    <button
                        className="px-6 py-2.5 rounded-md text-sm font-medium cursor-pointer border border-border bg-card text-foreground hover:bg-accent disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        className="px-6 py-2.5 rounded-md text-sm font-medium cursor-pointer border-none bg-primary text-primary-foreground hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleSave}
                        disabled={isSaving}
                    >
                        {isSaving ? 'Saving...' : 'Save Signature'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureEditModal;
