"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { MarcaFormPageClient } from "../MarcaFormPageClient";

function EditarMarcaInner() {
  const id = useSearchParams().get("id") ?? undefined;
  if (!id) return <p className="text-sm text-red-600">ID não informado.</p>;
  return <MarcaFormPageClient marcaId={id} />;
}

export default function EditarMarcaPage() {
  return (
    <MarcaOnlyGuard>
      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando...</p>}>
        <EditarMarcaInner />
      </Suspense>
    </MarcaOnlyGuard>
  );
}
