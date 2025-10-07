import Button from '@/components/ui/button/Button';
import Spinner from '@/components/ui/spinner/Spinner';

interface ActionButtonsProps {
  onReset: () => void;
  onCommit: () => void;
  isSubmitting?: boolean;
  hasUnsavedChanges?: boolean;
  hasAnyPairwiseComparisons?: boolean;
}

export default function ActionButtons({ onReset, onCommit, isSubmitting = false, hasUnsavedChanges = false, hasAnyPairwiseComparisons = false }: ActionButtonsProps) {
  return (
    <div className="mt-2 mx-10 flex gap-2">
      <Button
        type="button"
        size="md"
        variant="outline"
        onClick={onReset}
        className="w-full"
        disabled={hasUnsavedChanges || !hasAnyPairwiseComparisons}
      >
        Reset
      </Button>
      <Button
        type="button"
        size="md"
        variant="primary"
        className="w-full"
        onClick={onCommit}
        disabled={isSubmitting || hasUnsavedChanges || !hasAnyPairwiseComparisons}
      >
        {isSubmitting ? (
          <div className="flex items-center justify-center space-x-2">
            <Spinner size={16} />
            <span>Submitting...</span>
          </div>
        ) : (
          'Submit'
        )}
      </Button>
    </div>
  );
}
