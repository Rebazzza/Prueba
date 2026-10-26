import { Check, Heart, Settings, Sparkles } from "lucide-react";
import NotificationToggle from "../components/NotificationToggle";
import PageHeader from "../components/PageHeader";
import { useProfile, PROFILE_NAMES } from "../auth/ProfileContext";
import type { ProfileId } from "../auth/ProfileContext";

export default function SettingsPage({ onBack }: { onBack: () => void }) {
  const { profile, saveProfile } = useProfile();

  return (
    <div className="min-h-screen bg-gradient-to-b from-noir via-wine-950 to-noir pb-32">
      <PageHeader
        onBack={onBack}
        title="Ajustes"
        subtitle="Tu diario, a tu manera"
        icon={Settings}
        headerClass="bg-wine-950/95 backdrop-blur-xl"
        iconClass="text-gold-300"
      />

      <main className="mx-auto max-w-xl space-y-6 px-4 py-8">
        <section className="rounded-3xl border border-gold-400/20 bg-wine-950/70 p-5 shadow-xl">
          <div className="mb-4 flex items-center gap-2">
            <Heart className="h-4 w-4 fill-gold-400 text-gold-400" />
            <h2 className="font-serif text-lg text-stone-100">¿Quién eres hoy?</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {(["M", "R"] as ProfileId[]).map((id) => {
              const active = profile === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => saveProfile(id)}
                  className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-left transition-all active:scale-95 ${
                    active
                      ? "border-gold-300/50 bg-gold-400/15"
                      : "border-gold-400/20 bg-wine-950/60 hover:border-gold-300/40"
                  }`}
                >
                  <span className="font-serif text-base text-gold-100">
                    {PROFILE_NAMES[id]}
                  </span>
                  {active && <Check className="h-4 w-4 text-gold-300" />}
                </button>
              );
            })}
          </div>
          <p className="font-cormorant mt-3 text-xs text-stone-500 italic">
            Tu nombre firma las notas, mensajes y recuerdos que compartas.
          </p>
        </section>

        <NotificationToggle />

        <section className="rounded-3xl border border-gold-400/15 bg-wine-950/50 p-5">
          <div className="mb-2 flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-gold-400" />
            <h2 className="font-serif text-base text-stone-200">Un detalle</h2>
          </div>
          <p className="font-cormorant text-sm leading-relaxed text-stone-400 italic">
            Para recibir avisos en el celular, instalá el diario en la pantalla de
            inicio. En iPhone las notificaciones push solo funcionan así.
          </p>
        </section>
      </main>
    </div>
  );
}
