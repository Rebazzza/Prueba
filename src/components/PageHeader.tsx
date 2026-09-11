import { ChevronLeft } from "lucide-react";
import type { LucideIcon } from "lucide-react";

interface PageHeaderProps {
  onBack: () => void;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  headerClass: string;
  iconClass: string;
}

export default function PageHeader({
  onBack,
  title,
  subtitle,
  icon: Icon,
  headerClass,
  iconClass,
}: PageHeaderProps) {
  return (
    <header
      className={`sticky top-0 z-40 border-b border-black/5 shadow-sm ${headerClass}`}
    >
      <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-3">
        <button
          aria-label="Volver al inicio"
          onClick={onBack}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-wine-900/90 text-gold-200 shadow-md transition-transform active:scale-90"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <span
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-wine-900/90 shadow-md ${iconClass}`}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h1 className="font-script truncate text-2xl leading-tight font-bold text-gold-100">
            {title}
          </h1>
          {subtitle && (
            <p className="font-cormorant truncate text-[11px] leading-tight text-stone-400 italic">
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </header>
  );
}