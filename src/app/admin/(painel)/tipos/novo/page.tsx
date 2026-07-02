import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { TipoFormPageClient } from "../TipoFormPageClient";

export default function NovoTipoPage() {
  return (
    <MarcaOnlyGuard>
      <TipoFormPageClient />
    </MarcaOnlyGuard>
  );
}
