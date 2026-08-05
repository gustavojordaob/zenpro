import { Suspense } from "react";
import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { CampanhaFormPageClient } from "../CampanhaFormPageClient";

export default function AdminCampanhaEditarPage() {
  return (
    <MarcaOnlyGuard>
      <Suspense
        fallback={
          <div className="p-8 text-center text-sm text-zinc-500">
            Carregando…
          </div>
        }
      >
        <CampanhaFormPageClient />
      </Suspense>
    </MarcaOnlyGuard>
  );
}
