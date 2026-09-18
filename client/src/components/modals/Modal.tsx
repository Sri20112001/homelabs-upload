import { useEffect, useRef, type ReactNode } from 'react';
import { Icon } from '../ui/Icon';

interface ModalProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
}

export function Modal({ title, onClose, children }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-(--color-on-surface)/20 backdrop-blur-sm"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="w-full max-w-md bg-(--color-surface-container-lowest) rounded-2xl shadow-[0_20px_32px_-8px_rgba(23,25,28,0.08),0_8px_16px_-4px_rgba(23,25,28,0.04)] border border-(--color-surface-container-high) overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-(--color-surface-container-high)">
          <span className="font-family-geist text-[18px] font-medium text-(--color-on-surface)">
            {title}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-(--color-secondary) hover:text-(--color-on-surface) hover:bg-(--color-surface-container) transition-colors"
          >
            <Icon name="close" size={18} />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
