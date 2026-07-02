"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { ProdutoFormPageClient } from "../ProdutoFormPageClient";

function EditarProdutoInner() {
  const searchParams = useSearchParams();
  const produtoId = searchParams.get("id") ?? undefined;

  if (!produtoId) {
    return (
      <p className="text-sm text-red-600">
        ID do produto não informado. Volte à lista e clique em Editar.
      </p>
    );
  }

  return <ProdutoFormPageClient produtoId={produtoId} />;
}

export default function AdminProdutoEditarPage() {
  return (
    <MarcaOnlyGuard>
      <Suspense
        fallback={
          <p className="text-sm text-zinc-500">Carregando formulário...</p>
        }
      >
        <EditarProdutoInner />
      </Suspense>
    </MarcaOnlyGuard>
  );
}
