import { Images } from "lucide-react";
import PageHeader from "../components/PageHeader";
import ScrapbookGallery from "../components/ScrapbookGallery";

export default function GalleryPage({ onBack }: { onBack: () => void }) {
  return (
<div className="min-h-screen bg-gradient-to-b from-noir via-wine-950 to-noir pb-32">
      <PageHeader
        onBack={onBack}
        title="Galería de Recuerdos"
        subtitle="Nuestras polaroids"
        icon={Images}
        headerClass="bg-gradient-to-r from-wine-900/90 to-wine-950/90 border-b border-gold-400/15"
        iconClass="text-gold-300"
      />
      <ScrapbookGallery />
    </div>
  );
}