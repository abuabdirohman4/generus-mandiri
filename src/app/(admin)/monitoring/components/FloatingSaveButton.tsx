'use client';

import { FloppyDiskIcon } from '@/lib/icons';

interface FloatingSaveButtonProps {
    onSave: () => void;
    saving?: boolean;
    disabled?: boolean;
}

export default function FloatingSaveButton({
    onSave,
    saving = false,
    disabled = false
}: FloatingSaveButtonProps) {
    return (
        <button
            onClick={onSave}
            disabled={disabled || saving}
            className="
                fixed md:hidden bottom-[70px] md:bottom-6 right-6 w-14 h-14 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 flex items-center justify-center z-50
            "
            title="Simpan Progress"
        >
            {saving ? (
                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
                <FloppyDiskIcon className="w-6 h-6" />
            )}
        </button>
    );
}
