import { useState, useEffect } from 'react';
import TrumbowEditor from '@/components/editor/TrumbowEditor';
import styles from './SignatureEditModal.module.scss';
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
        <div className={styles.overlay} onClick={handleClose}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <div className={styles.header}>
                    <h2>Edit Signature</h2>
                    <button
                        className={styles.closeBtn}
                        onClick={handleClose}
                        disabled={isSaving}
                    >
                        ×
                    </button>
                </div>

                <div className={styles.content}>
                    <div className={styles.editorSection}>
                        <label>Signature Content</label>
                        <TrumbowEditor
                            value={editedSignature.signature}
                            onChange={handleContentChange}
                            placeholder="Enter your signature HTML here..."
                        />
                    </div>
                </div>

                <div className={styles.footer}>
                    <button
                        className={styles.cancelBtn}
                        onClick={handleClose}
                        disabled={isSaving}
                    >
                        Cancel
                    </button>
                    <button
                        className={styles.saveBtn}
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
