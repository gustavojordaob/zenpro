"use client";

import {
  beneficiosDoNivel,
  listarBeneficiosTexto,
  rotuloNivelRevendedor,
  type BeneficioNivel,
  type MetricasRevendedorVolume,
  type NivelRevendedor,
  type NiveisRevendedorConfig,
} from "@/features/admin/revendedores/niveisRevendedorService";
import { formatarPreco } from "@/features/loja/produtosMock";

function badgeClass(nivel: NivelRevendedor) {
  if (nivel === "ouro") return "bg-amber-100 text-amber-900 ring-amber-300";
  if (nivel === "prata") return "bg-zinc-200 text-zinc-800 ring-zinc-400";
  return "bg-orange-100 text-orange-900 ring-orange-300";
}

type Props = {
  nivel: NivelRevendedor;
  beneficios?: BeneficioNivel;
  config?: NiveisRevendedorConfig | null;
  metricas?: MetricasRevendedorVolume | null;
  compact?: boolean;
  emailContato?: string;
};

export function NivelRevendedorCard({
  nivel,
  beneficios,
  config,
  metricas,
  compact,
  emailContato,
}: Props) {
  const ben =
    beneficios ??
    (config ? beneficiosDoNivel(nivel, config) : null) ??
    metricas?.beneficios;
  const itens = ben ? listarBeneficiosTexto(ben) : [];

  return (
    <div
      className={`rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 shadow-sm ${
        compact ? "" : "sm:p-5"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wide ring-1 ${badgeClass(nivel)}`}
        >
          Nível {rotuloNivelRevendedor(nivel)}
        </span>
        {metricas && (
          <span className="text-xs text-zinc-500">
            Volume total {formatarPreco(metricas.volumeTotalCentavos)}
          </span>
        )}
      </div>

      {!compact && metricas && (
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-zinc-100">
            <p className="text-[10px] font-semibold uppercase text-zinc-500">
              Este mês
            </p>
            <p className="text-sm font-semibold text-zinc-900">
              {formatarPreco(metricas.volumeMesCentavos)}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-zinc-100">
            <p className="text-[10px] font-semibold uppercase text-zinc-500">
              Este ano
            </p>
            <p className="text-sm font-semibold text-zinc-900">
              {formatarPreco(metricas.volumeAnoCentavos)}
            </p>
          </div>
          <div className="rounded-lg bg-white/80 px-3 py-2 ring-1 ring-zinc-100">
            <p className="text-[10px] font-semibold uppercase text-zinc-500">
              Pedidos (ano)
            </p>
            <p className="text-sm font-semibold text-zinc-900">
              {metricas.pedidosAno}
            </p>
          </div>
        </div>
      )}

      <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-teal-800">
        Seus benefícios
      </p>
      <ul className="mt-1.5 list-inside list-disc space-y-0.5 text-sm text-zinc-700">
        {itens.map((t) => (
          <li key={t}>{t}</li>
        ))}
      </ul>

      {emailContato ? (
        <p className="mt-3 text-xs text-zinc-500">
          Contato Zen Pro:{" "}
          <a
            href={`mailto:${emailContato}`}
            className="font-medium text-teal-800 underline"
          >
            {emailContato}
          </a>
        </p>
      ) : null}

      {config && (
        <p className="mt-2 text-[11px] text-zinc-500">
          Prata a partir de {formatarPreco(config.prataMinCentavos)} · Ouro a
          partir de {formatarPreco(config.ouroMinCentavos)}
        </p>
      )}
    </div>
  );
}
