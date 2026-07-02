"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { ModeloFormPageClient } from "../ModeloFormPageClient";

function EditarModeloInner() {
  const id = useSearchParams().get("id") ?? undefined;
  if (!id) return <p className="text-sm text-red-600">ID não informado.</p>;
  return <ModeloFormPageClient modeloId={id} />;
}

export default function EditarModeloPage() {
  return (
    <MarcaOnlyGuard>
      <Suspense fallback={<p className="text-sm text-zinc-500">Carregando...</p>}>
        <EditarModeloInner />
      </Suspense>
    </MarcaOnlyGuard>
  );
}
