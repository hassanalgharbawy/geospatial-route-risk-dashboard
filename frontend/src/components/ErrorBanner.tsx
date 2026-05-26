import { AlertTriangle } from "lucide-react";

interface ErrorBannerProps {
  title?: string;
  message: string;
}

export function ErrorBanner({ title = "Unable to load dashboard data", message }: ErrorBannerProps) {
  return (
    <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-4 text-red-900">
      <AlertTriangle className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm leading-6 text-red-800">{message}</p>
      </div>
    </div>
  );
}
