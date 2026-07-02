import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { ProdutosAdminPageClient } from "./ProdutosAdminPageClient";

export default function AdminProdutosPage() {
  return (
    <MarcaOnlyGuard>
      <ProdutosAdminPageClient />
    </MarcaOnlyGuard>
  );
}
