interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    isLoading?: boolean;
}

const ConfirmModal = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    isLoading = false,
}: ConfirmModalProps) => {
    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
            onClick={onCancel}
        >
            <div
                className="animate-in fade-in-0 zoom-in-95 duration-200 bg-card w-[90%] max-w-100 rounded-lg border border-border p-8 shadow-lg"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="mb-4 text-center text-5xl text-destructive">
                    ⚠️
                </div>
                <h2 className="mb-3 text-center text-xl font-semibold text-foreground">
                    {title}
                </h2>
                <p className="mb-6 text-center text-sm leading-relaxed text-muted-foreground">
                    {message}
                </p>
                <div className="flex justify-end gap-3">
                    <button
                        className="cursor-pointer rounded-md bg-secondary px-5 py-2.5 text-sm font-medium text-secondary-foreground transition-all hover:-translate-y-px hover:bg-secondary/80 disabled:pointer-events-none disabled:opacity-50"
                        onClick={onCancel}
                        disabled={isLoading}
                    >
                        Hủy
                    </button>
                    <button
                        className="cursor-pointer rounded-md bg-destructive px-5 py-2.5 text-sm font-medium text-white transition-all hover:-translate-y-px hover:bg-destructive/90 disabled:pointer-events-none disabled:opacity-50"
                        onClick={onConfirm}
                        disabled={isLoading}
                    >
                        {isLoading ? 'Đang xử lý...' : 'Xác nhận'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
