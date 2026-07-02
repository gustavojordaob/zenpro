import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { RevendedorNovoPageClient } from "./RevendedorNovoPageClient";

export default function RevendedorNovoPage() {
  return (
    <MarcaOnlyGuard>
      <RevendedorNovoPageClient />
    </MarcaOnlyGuard>
  );
}
