import type { ReactNode } from 'react';

export function ModalShell({
  onClose,
  children,
  maxWidth = 'max-w-[430px]',
}: {
  onClose: () => void;
  children: ReactNode;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden="true" />
      <div className={`relative bg-card rounded-2xl px-6 pt-6 pb-8 z-50 ${maxWidth} w-full mx-auto shadow-xl`}>
        {children}
      </div>
    </div>
  );
}
