import type { ReactNode } from 'react';
import { Dialog, DialogContent } from './dialog';

export type ModalSize =
    | 'xs'
    | 'sm'
    | 'md'
    | 'lg'
    | 'xl'
    | '2xl'
    | '3xl'
    | '4xl'
    | '5xl'
    | '6xl'
    | '7xl'
    | 'fullscreen';

interface BaseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    size?: ModalSize;
    children: ReactNode;
    className?: string;
}

export function BaseModal({
    open,
    onOpenChange,
    size = 'md',
    children,
    className = '',
}: BaseModalProps) {
    const sizeClasses: Record<ModalSize, string> = {
        xs: 'max-w-xs',
        sm: 'max-w-sm',
        md: 'max-w-md',
        lg: 'max-w-lg',
        xl: '!w-[95vw] sm:!max-w-md lg:!max-w-xl',
        '2xl': '!w-[95vw] sm:!max-w-lg lg:!max-w-2xl',
        '3xl': '!w-[95vw] sm:!max-w-2xl lg:!max-w-3xl !max-h-[90vh] !p-0 !gap-0 overflow-hidden flex flex-col',
        '4xl': '!w-[95vw] sm:!max-w-2xl lg:!max-w-4xl !max-h-[90vh] overflow-y-auto',
        '5xl': '!w-[95vw] sm:!max-w-3xl lg:!max-w-5xl !max-h-[90vh] !p-0 !gap-0 overflow-hidden flex flex-col',
        '6xl': '!w-[95vw] sm:!max-w-4xl lg:!max-w-6xl !max-h-[90vh] !p-0 !gap-0 overflow-hidden flex flex-col',
        '7xl': '!w-[95vw] sm:!max-w-5xl lg:!max-w-7xl !max-h-[90vh] !p-0 !gap-0 overflow-hidden flex flex-col',
        fullscreen: '!w-[95vw] !h-[90vh] !max-w-none !p-0 !gap-0 flex flex-col overflow-hidden',
    };

    const modalClassName = `${sizeClasses[size]} ${className}`.trim();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className={modalClassName}>{children}</DialogContent>
        </Dialog>
    );
}
