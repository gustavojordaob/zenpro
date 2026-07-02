import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { SolicitacoesRevendedorAdminPageClient } from "./SolicitacoesRevendedorAdminPageClient";

export default function SolicitacoesRevendedorAdminPage() {
  return (
    <MarcaOnlyGuard>
      <SolicitacoesRevendedorAdminPageClient />
    </MarcaOnlyGuard>
  );
}
