import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { TiposAdminPageClient } from "./TiposAdminPageClient";

export default function TiposAdminPage() {
  return (
    <MarcaOnlyGuard>
      <TiposAdminPageClient />
    </MarcaOnlyGuard>
  );
}
