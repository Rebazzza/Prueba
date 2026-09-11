import { MessageCircle } from "lucide-react";
import PageHeader from "../components/PageHeader";
import LiveComms from "../components/LiveComms";

export default function MessagesPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-noir via-wine-950 to-noir pb-32">
      <PageHeader
        onBack={onBack}
        title="Chat Intergaláctico"
        subtitle="Mensajes en tiempo real"
        icon={MessageCircle}
        headerClass="bg-gradient-to-r from-wine-900/90 to-wine-950/90 border-b border-gold-400/15"
        iconClass="text-gold-300"
      />
      <LiveComms />
    </div>
  );
}