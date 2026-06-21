import { Children, isValidElement } from "react";

type StepProps = {
  title: string;
  children: React.ReactNode;
};

export function Step({ title, children }: StepProps) {
  return (
    <div className="step-item">
      <span className="step-title">{title}</span>
      <div className="step-body">{children}</div>
    </div>
  );
}

type StepsProps = {
  children: React.ReactNode;
};

export function Steps({ children }: StepsProps) {
  const steps = Children.toArray(children).filter(isValidElement);

  return (
    <ol className="not-prose my-6 space-y-0 pl-0 list-none">
      {steps.map((step, index) => (
        <li key={index} className="relative flex gap-4 pb-8 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white dark:bg-blue-500">
              {index + 1}
            </div>
            {index < steps.length - 1 && (
              <div className="mt-2 w-px flex-1 bg-gray-200 dark:bg-gray-700" />
            )}
          </div>
          <div className="min-w-0 flex-1 pt-0.5">
            {step}
          </div>
        </li>
      ))}
    </ol>
  );
}
