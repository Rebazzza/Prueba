import { Mail } from "lucide-react";
import PageHeader from "../components/PageHeader";
import OhanaNotes from "../components/OhanaNotes";

export default function NotesPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-noir via-wine-950 to-noir pb-32">
      <PageHeader
        onBack={onBack}
        title="Buzón de Ohana"
        subtitle="Notas de amor"
        icon={Mail}
        headerClass="bg-gradient-to-r from-wine-900/90 to-wine-950/90 border-b border-gold-400/15"
        iconClass="text-gold-300"
      />
      <OhanaNotes />
    </div>
  );
}