import { useState, useEffect } from 'react';

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
        <div
            className="fixed inset-0 z-999 flex items-center justify-center bg-black/50"
            onClick={onCancel}
        >
            <div
                className="w-[90%] max-w-100 animate-in zoom-in-95 fade-in-0 rounded-lg bg-card p-8 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 className="mb-5 text-xl font-semibold text-foreground">
                    Đổi tên Campaign
                </h2>
                <div className="mb-6">
                    <label className="mb-2 block text-sm font-medium text-foreground">
                        Tên campaign mới
                    </label>
                    <input
                        type="text"
                        className="w-full rounded-md border border-input bg-input-background px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Nhập tên campaign"
                        autoFocus
                    />
                </div>
                <div className="flex justify-end gap-3">
                    <button
                        className="rounded-md bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition-all hover:not-disabled:bg-secondary/80 hover:not-disabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Hủy
                    </button>
                    <button
                        className="rounded-md bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-all hover:not-disabled:bg-primary/90 hover:not-disabled:-translate-y-px disabled:cursor-not-allowed disabled:opacity-60"
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
