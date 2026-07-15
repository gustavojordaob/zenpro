"use client";

import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  aplicarDescontoNivel,
  listarBeneficiosTexto,
  metricasVolumeRevendedor,
  obterNiveisRevendedorConfig,
  type BeneficioNivel,
  type MetricasRevendedorVolume,
} from "@/features/admin/revendedores/niveisRevendedorService";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";

export type BeneficiosCheckoutB2b = {
  metricas: MetricasRevendedorVolume;
  beneficio: BeneficioNivel;
  descontoPercentual: number;
  descontoCentavos: number;
  totalComDesconto: number;
  freteGratis: boolean;
  textos: string[];
};

/** Carrega nível/benefícios e calcula desconto sobre o subtotal do carrinho B2B. */
export function useBeneficiosCheckoutB2b(
  subtotalCentavos: number,
): BeneficiosCheckoutB2b | null {
  const loja = useLojaEfetiva();
  const { user } = useAuth();
  const [metricas, setMetricas] = useState<MetricasRevendedorVolume | null>(
    null,
  );

  useEffect(() => {
    if (!loja?.isB2b || !user?.uid) {
      setMetricas(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const cfg = await obterNiveisRevendedorConfig();
        const m = await metricasVolumeRevendedor(user.uid, cfg);
        if (!cancelled) setMetricas(m);
      } catch (e) {
        console.error(e);
        if (!cancelled) setMetricas(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loja?.isB2b, user?.uid]);

  return useMemo(() => {
    if (!loja?.isB2b || !metricas) return null;
    const beneficio = metricas.beneficios;
    const { descontoCentavos, totalComDesconto } = aplicarDescontoNivel(
      subtotalCentavos,
      beneficio.descontoPercentual,
    );
    return {
      metricas,
      beneficio,
      descontoPercentual: beneficio.descontoPercentual,
      descontoCentavos,
      totalComDesconto,
      freteGratis: beneficio.freteGratis,
      textos: listarBeneficiosTexto(beneficio),
    };
  }, [loja?.isB2b, metricas, subtotalCentavos]);
}
