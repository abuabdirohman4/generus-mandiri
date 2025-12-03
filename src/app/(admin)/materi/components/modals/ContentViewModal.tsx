'use client';

import { Modal } from '@/components/ui/modal';
import Button from '@/components/ui/button/Button';
import { MaterialItem } from '../../types';

interface ContentViewModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: MaterialItem | null;
}

export default function ContentViewModal({ isOpen, onClose, item }: ContentViewModalProps) {
    if (!item) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="max-w-2xl m-4">
            <div className="space-y-4">
                <div className="border-b pb-4 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                        {item.name}
                    </h3>
                    {item.material_type && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                            {item.material_type.name}
                        </p>
                    )}
                </div>

                <div className="py-4">
                    {item.content ? (
                        <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap text-gray-700 dark:text-gray-300">
                            {item.content}
                        </div>
                    ) : (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400 italic">
                            Tidak ada konten untuk materi ini
                        </div>
                    )}
                </div>

                <div className="flex justify-end pt-4 border-t dark:border-gray-700">
                    <Button onClick={onClose} variant="primary">
                        Tutup
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
