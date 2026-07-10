import { Suspense } from "react";
import { CheckoutRetornoPageClient } from "@/components/loja/CheckoutRetornoPageClient";

export default function CheckoutRetornoPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-zinc-50 pt-20 text-center">Carregando...</div>}>
      <CheckoutRetornoPageClient />
    </Suspense>
  );
}
