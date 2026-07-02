import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { RevendedoresAdminPageClient } from "./RevendedoresAdminPageClient";

export default function RevendedoresAdminPage() {
  return (
    <MarcaOnlyGuard>
      <RevendedoresAdminPageClient />
    </MarcaOnlyGuard>
  );
}
