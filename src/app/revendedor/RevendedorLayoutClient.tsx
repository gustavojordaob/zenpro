"use client";

import type { ReactNode } from "react";
import { LojaProvider } from "@/features/multitenant/LojaContext";
import { RevendedorB2BGuard } from "@/components/revendedor/RevendedorB2BGuard";
import { NivelRevendedorSitePanel } from "@/components/revendedor/NivelRevendedorSitePanel";
import {
  REVENDEDOR_B2B_BASE_PATH,
  REVENDEDOR_B2B_LOJA_PUBLICA,
} from "@/features/revendedor/revendedorB2bLoja";

export function RevendedorLayoutClient({ children }: { children: ReactNode }) {
  return (
    <LojaProvider
      loja={REVENDEDOR_B2B_LOJA_PUBLICA}
      basePath={REVENDEDOR_B2B_BASE_PATH}
      isB2b
    >
      <RevendedorB2BGuard>
        <div className="border-b border-teal-800 bg-teal-800 text-center text-xs font-semibold uppercase tracking-wide text-teal-50">
          Site do revendedor — preços atacado · pedidos para a Zen Pro
        </div>
        <NivelRevendedorSitePanel />
        {children}
      </RevendedorB2BGuard>
    </LojaProvider>
  );
}
