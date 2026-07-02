"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { TipoFormPageClient } from "../TipoFormPageClient";

function EditarTipoInner() {
  const id = useSearchParams().get("id") ?? undefined;
  if (!id) return <p className="text-sm text-red-600">ID não informado.</p>;
  return <TipoFormPageClient tipoId={id} />;
}

export default function EditarTipoPage() {
  return (
    <MarcaOnlyGuard>
      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando...</p>}>
        <EditarTipoInner />
      </Suspense>
    </MarcaOnlyGuard>
  );
}
