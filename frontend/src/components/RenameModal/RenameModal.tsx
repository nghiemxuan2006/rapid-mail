import { useState, useEffect } from 'react';
import styles from './RenameModal.module.scss';

interface RenameModalProps {
    isOpen: boolean;
    currentName: string;
    onSave: (newName: string) => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const RenameModal = ({
    isOpen,
    currentName,
    onSave,
    onCancel,
    isLoading = false,
}: RenameModalProps) => {
    const [inputValue, setInputValue] = useState(currentName);

    useEffect(() => {
        if (isOpen) {
            setInputValue(currentName);
        }
    }, [isOpen, currentName]);

    const handleSave = () => {
        if (inputValue.trim() && inputValue !== currentName) {
            onSave(inputValue.trim());
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSave();
        } else if (e.key === 'Escape') {
            onCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.overlay} onClick={onCancel}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
                <h2 className={styles.title}>Đổi tên Campaign</h2>
                <div className={styles.inputGroup}>
                    <label className={styles.label}>Tên campaign mới</label>
                    <input
                        type="text"
                        className={styles.input}
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập tên campaign"
                        autoFocus
                    />
                </div>
                <div className={styles.actions}>
                    <button
                        className={styles.cancelButton + ' ' + styles.button}
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Hủy
                    </button>
                    <button
                        className={styles.saveButton + ' ' + styles.button}
                        onClick={handleSave}
                        disabled={isLoading || !inputValue.trim() || inputValue === currentName}
                    >
                        {isLoading ? 'Đang lưu...' : 'Lưu'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default RenameModal;
