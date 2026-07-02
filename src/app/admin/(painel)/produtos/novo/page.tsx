import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { ProdutoFormPageClient } from "../ProdutoFormPageClient";

export default function AdminProdutoNovoPage() {
  return (
    <MarcaOnlyGuard>
      <ProdutoFormPageClient />
    </MarcaOnlyGuard>
  );
}
