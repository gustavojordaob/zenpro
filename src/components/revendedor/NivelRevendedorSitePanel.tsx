"use client";

import { useEffect, useState } from "react";
import { NivelRevendedorCard } from "@/components/revendedor/NivelRevendedorCard";
import { useAuth } from "@/features/auth/AuthProvider";
import {
  metricasVolumeRevendedor,
  obterNiveisRevendedorConfig,
  type MetricasRevendedorVolume,
  type NiveisRevendedorConfig,
} from "@/features/admin/revendedores/niveisRevendedorService";

/** Card no portal /revendedor (site B2B). */
export function NivelRevendedorSitePanel() {
  const { user } = useAuth();
  const [metricas, setMetricas] = useState<MetricasRevendedorVolume | null>(
    null,
  );
  const [config, setConfig] = useState<NiveisRevendedorConfig | null>(null);

  useEffect(() => {
    if (!user?.uid) return;
    let cancelled = false;
    void (async () => {
      try {
        const cfg = await obterNiveisRevendedorConfig();
        const m = await metricasVolumeRevendedor(user.uid, cfg);
        if (cancelled) return;
        setConfig(cfg);
        setMetricas(m);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  if (!metricas) return null;

  return (
    <div className="mx-auto max-w-6xl px-4 pt-6 sm:px-6">
      <NivelRevendedorCard
        nivel={metricas.nivel}
        metricas={metricas}
        config={config}
        emailContato={config?.emailContatoZenPro}
      />
    </div>
  );
}
