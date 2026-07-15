"use client";

import { useEffect, useState } from "react";
import { NivelRevendedorCard } from "@/components/revendedor/NivelRevendedorCard";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import {
  metricasVolumeRevendedor,
  obterNiveisRevendedorConfig,
  type MetricasRevendedorVolume,
  type NiveisRevendedorConfig,
} from "@/features/admin/revendedores/niveisRevendedorService";

/** Card de nível + benefícios no dashboard do revendedor. */
export function NivelRevendedorAdminPanel() {
  const { sessao, isRevendedor, user } = useAuthAdmin();
  const [metricas, setMetricas] = useState<MetricasRevendedorVolume | null>(
    null,
  );
  const [config, setConfig] = useState<NiveisRevendedorConfig | null>(null);

  useEffect(() => {
    if (!isRevendedor || !user?.uid) return;
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
  }, [isRevendedor, user?.uid, sessao?.lojaId]);

  if (!isRevendedor || !metricas) return null;

  return (
    <div className="mb-6">
      <NivelRevendedorCard
        nivel={metricas.nivel}
        metricas={metricas}
        config={config}
        emailContato={config?.emailContatoZenPro}
      />
    </div>
  );
}
