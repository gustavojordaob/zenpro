import { Suspense } from "react";
import { ReposicaoCheckoutRetornoPageClient } from "@/components/admin/ReposicaoCheckoutRetornoPageClient";

export default function ReposicaoCheckoutRetornoPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
          Carregando…
        </div>
      }
    >
      <ReposicaoCheckoutRetornoPageClient />
    </Suspense>
  );
}
