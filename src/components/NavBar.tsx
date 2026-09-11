import {
  Feather,
  Home,
  Images,
  ListChecks,
  Mail,
  MessageCircle,
  Moon,
  ShoppingBag,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { View } from "../types";

const NAV_ITEMS: { id: View; label: string; icon: LucideIcon }[] = [
  { id: "home", label: "Inicio", icon: Home },
  { id: "messages", label: "Mensajes", icon: MessageCircle },
  { id: "notes", label: "Buzón", icon: Mail },
  { id: "bucket", label: "Bucket", icon: ListChecks },
  { id: "gallery", label: "Galería", icon: Images },
  { id: "promises", label: "Promesas", icon: Feather },
  { id: "dreams", label: "Sueños", icon: Moon },
  { id: "wishlist", label: "Cosas", icon: ShoppingBag },
];

interface NavBarProps {
  view: View;
  onNavigate: (view: View) => void;
}

export default function NavBar({ view, onNavigate }: NavBarProps) {
  return (
    <nav
      className="fixed bottom-3 left-1/2 z-50 w-[calc(100%-1.25rem)] max-w-xl -translate-x-1/2"
      style={{ bottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <div className="flex items-stretch gap-1 overflow-x-auto rounded-[1.6rem] border border-gold-400/20 bg-wine-950/90 px-1.5 py-1.5 shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_ITEMS.map((item) => {
          const active = view === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="flex min-w-0 flex-1 shrink-0 flex-col items-center gap-0.5 px-1.5 py-1"
            >
              <span
                className={`flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                  active
                    ? "bg-gold-400/15 text-gold-300"
                    : "text-stone-500"
                }`}
              >
                <item.icon
                  size={19}
                  strokeWidth={active ? 2.6 : 2}
                  fill={active ? "currentColor" : "none"}
                />
              </span>
              <span
                className={`text-[9px] leading-none truncate ${
                  active
                    ? "font-bold text-gold-300"
                    : "font-medium text-stone-500"
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}