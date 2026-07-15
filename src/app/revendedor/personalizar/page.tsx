import { Suspense } from "react";
import { PersonalizarPageClient } from "@/app/personalizar/PersonalizarPageClient";

export default function RevendedorPersonalizarPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
          Carregando...
        </div>
      }
    >
      <PersonalizarPageClient />
    </Suspense>
  );
}
