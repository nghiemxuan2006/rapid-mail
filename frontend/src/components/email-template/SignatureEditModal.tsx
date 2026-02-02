import { useState, useRef, useEffect } from 'react';
import Editor, { type EditorHandle } from '@/components/editor/Editor';
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
    const editorRef = useRef<EditorHandle>(null);
    const [editedSignature, setEditedSignature] = useState<Signature | null>(signature);
    const initializedRef = useRef(false);

    // Update editedSignature when signature prop changes
    useEffect(() => {
        if (isOpen && signature) {
            setEditedSignature(signature);
            initializedRef.current = false; // Reset flag when opening modal
        }
    }, [isOpen, signature?.sendAsEmail]);

    // Set editor content ONLY on initial load
    useEffect(() => {
        if (isOpen && signature && !initializedRef.current && editorRef.current) {
            initializedRef.current = true;
            editorRef.current.setContent(signature.signature);
        }
    }, [isOpen, signature?.sendAsEmail]);

    const handleClose = () => {
        onClose();
        setEditedSignature(null);
    };

    const handleSave = () => {
        if (!editedSignature) return;

        const content = editorRef.current?.getContent() || '';
        const updatedSignature: Signature = {
            ...editedSignature,
            signature: content,
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
                        <Editor
                            ref={editorRef}
                            value={editedSignature.signature}
                            onChange={handleContentChange}
                            placeholder="Enter your signature HTML here..."
                            readOnly={isSaving}
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
