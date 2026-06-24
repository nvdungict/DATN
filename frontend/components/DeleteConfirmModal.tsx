'use client';
import * as Dialog from '@radix-ui/react-dialog';
import { Trash2, AlertTriangle, X } from 'lucide-react';
import { useState } from 'react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
  title?: string;
  description?: string;
}

export default function DeleteConfirmModal({
  isOpen,
  onOpenChange,
  onConfirm,
  title = "Delete Trip",
  description = "Are you sure you want to delete this trip? This action cannot be undone and all your itineraries, expenses, and plans will be permanently removed."
}: DeleteConfirmModalProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleConfirm = async () => {
    setIsDeleting(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog.Root open={isOpen} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity" />
        <Dialog.Content className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl shadow-2xl z-50 overflow-hidden focus:outline-none">
          
          <div className="p-6">
            <div className="flex items-start justify-between mb-5">
              <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <Dialog.Close className="text-slate-500 hover:text-white transition">
                <X className="w-5 h-5" />
              </Dialog.Close>
            </div>

            <Dialog.Title className="text-xl font-bold text-white mb-2">
              {title}
            </Dialog.Title>
            
            <Dialog.Description className="text-slate-400 text-sm leading-relaxed mb-8">
              {description}
            </Dialog.Description>

            <div className="flex gap-3 justify-end">
              <Dialog.Close asChild>
                <button 
                  disabled={isDeleting}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold text-slate-300 hover:text-white hover:bg-white/5 transition"
                >
                  Cancel
                </button>
              </Dialog.Close>
              <button
                onClick={handleConfirm}
                disabled={isDeleting}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold bg-red-500 hover:bg-red-600 text-white transition disabled:opacity-50"
              >
                {isDeleting ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
          
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
