import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { CampanhaFormPageClient } from "../CampanhaFormPageClient";

export default function AdminCampanhaNovaPage() {
  return (
    <MarcaOnlyGuard>
      <CampanhaFormPageClient />
    </MarcaOnlyGuard>
  );
}
