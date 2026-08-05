import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { CampanhasAdminPageClient } from "./CampanhasAdminPageClient";

export default function AdminCampanhasPage() {
  return (
    <MarcaOnlyGuard>
      <CampanhasAdminPageClient />
    </MarcaOnlyGuard>
  );
}
