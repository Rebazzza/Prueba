import { ListChecks } from "lucide-react";
import PageHeader from "../components/PageHeader";
import CoupleBucketList from "../components/CoupleBucketList";

export default function BucketListPage({ onBack }: { onBack: () => void }) {
  return (
    <div className="min-h-screen bg-gradient-to-b from-noir via-wine-950 to-noir pb-32">
      <PageHeader
        onBack={onBack}
        title="Bucket List en Pareja"
        subtitle="Nuestras aventuras pendientes"
        icon={ListChecks}
        headerClass="bg-gradient-to-r from-wine-900/90 to-wine-950/90 border-b border-gold-400/15"
        iconClass="text-gold-300"
      />
      <CoupleBucketList />
    </div>
  );
}