import { Suspense } from "react";
import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { RevendedorEditarPageClient } from "./RevendedorEditarPageClient";

export default function RevendedorEditarPage() {
  return (
    <MarcaOnlyGuard>
      <Suspense fallback={<p className="p-8 text-sm text-zinc-500">Carregando...</p>}>
        <RevendedorEditarPageClient />
      </Suspense>
    </MarcaOnlyGuard>
  );
}
