import { LoaderCircle } from "lucide-react";

interface LoadingBlockProps {
  label: string;
  minHeight?: string;
}

export function LoadingBlock({ label, minHeight = "min-h-48" }: LoadingBlockProps) {
  return (
    <div className={`grid ${minHeight} place-items-center rounded-lg border border-stone-200 bg-white text-stone-600`}>
      <div className="flex items-center gap-2 text-sm font-medium">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" />
        {label}
      </div>
    </div>
  );
}
