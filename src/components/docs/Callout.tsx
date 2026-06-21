import { InfoIcon, AlertIcon, CheckCircleIcon } from "@/lib/icons";

type CalloutType = "info" | "warning" | "tip";

type Props = {
  type?: CalloutType;
  title?: string;
  children: React.ReactNode;
};

const config: Record<CalloutType, { icon: React.ReactNode; classes: string }> = {
  info: {
    icon: <InfoIcon className="h-4 w-4 shrink-0 mt-0.5" />,
    classes:
      "border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-800 dark:bg-blue-950/50 dark:text-blue-200",
  },
  warning: {
    icon: <AlertIcon className="h-4 w-4 shrink-0 mt-0.5" />,
    classes:
      "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-800 dark:bg-amber-950/50 dark:text-amber-200",
  },
  tip: {
    icon: <CheckCircleIcon className="h-4 w-4 shrink-0 mt-0.5" />,
    classes:
      "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/50 dark:text-green-200",
  },
};

export function Callout({ type = "info", title, children }: Props) {
  const { icon, classes } = config[type];

  return (
    <div className={`not-prose my-4 flex gap-3 rounded-lg border p-4 text-sm ${classes}`}>
      {icon}
      <div className="min-w-0">
        {title && <p className="mb-1 font-semibold">{title}</p>}
        <div className="[&_p]:m-0 [&_p]:leading-relaxed">{children}</div>
      </div>
    </div>
  );
}
