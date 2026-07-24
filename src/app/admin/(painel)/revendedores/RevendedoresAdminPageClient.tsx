"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  centavosParaReaisInput,
  reaisInputParaCentavos,
} from "@/features/admin/produtos/produtoFormUtils";
import {
  listarNiveisRevendedores,
  obterNiveisRevendedorConfig,
  rankingRevendedores,
  rankingRevendedoresNoIntervalo,
  rankingRevendedoresNoMes,
  rotuloNivelRevendedor,
  salvarNiveisRevendedorConfig,
  type BeneficioNivel,
  type NivelRevendedor,
  type NiveisRevendedorConfig,
  type RankingItemMes,
  type RevendedorComNivel,
  NIVEIS_REVENDEDOR_DEFAULT,
} from "@/features/admin/revendedores/niveisRevendedorService";
import {
  alternarAtivoRevendedorAdmin,
  listarRevendedoresAdmin,
  type RevendedorAdmin,
} from "@/features/admin/revendedores/revendedorAdminService";
import { formatarPreco } from "@/features/loja/produtosMock";

function ymAtual(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function parseYm(ym: string): { ano: number; mesIndex0: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) return null;
  return { ano, mesIndex0: mes - 1 };
}

/** Valor `YYYY-Www` da semana ISO atual (segunda–domingo). */
function isoWeekAtual(): string {
  const now = new Date();
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayNr = (target.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = new Date(target.getFullYear(), 0, 4);
  const week =
    1 +
    Math.round(
      ((target.getTime() - firstThursday.getTime()) / 86400000 -
        3 +
        ((firstThursday.getDay() + 6) % 7)) /
        7,
    );
  return `${target.getFullYear()}-W${String(week).padStart(2, "0")}`;
}

function intervaloIsoWeek(
  weekValue: string,
): { inicio: Date; fim: Date } | null {
  const m = /^(\d{4})-W(\d{2})$/.exec(weekValue);
  if (!m) return null;
  const year = Number(m[1]);
  const week = Number(m[2]);
  if (week < 1 || week > 53) return null;
  const jan4 = new Date(year, 0, 4);
  const jan4Day = (jan4.getDay() + 6) % 7;
  const mondayWeek1 = new Date(year, 0, 4 - jan4Day);
  const inicio = new Date(mondayWeek1);
  inicio.setDate(mondayWeek1.getDate() + (week - 1) * 7);
  inicio.setHours(0, 0, 0, 0);
  const fim = new Date(inicio);
  fim.setDate(inicio.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return { inicio, fim };
}

type RankingPeriodo = "semana" | "mes" | "ano" | "total";

function badgeNivel(nivel: NivelRevendedor) {
  if (nivel === "ouro") {
    return "bg-amber-100 text-amber-900 ring-1 ring-amber-300";
  }
  if (nivel === "prata") {
    return "bg-zinc-200 text-zinc-800 ring-1 ring-zinc-400";
  }
  return "bg-orange-100 text-orange-900 ring-1 ring-orange-300";
}

function BeneficioEditor({
  titulo,
  value,
  onChange,
}: {
  titulo: string;
  value: BeneficioNivel;
  onChange: (next: BeneficioNivel) => void;
}) {
  return (
    <fieldset className="space-y-2 rounded-xl border border-zinc-200 bg-white p-3">
      <legend className="px-1 text-sm font-semibold text-zinc-800">{titulo}</legend>
      <label className="block text-xs text-zinc-600">
        Desconto (%)
        <input
          type="number"
          min={0}
          max={100}
          value={value.descontoPercentual}
          onChange={(e) =>
            onChange({
              ...value,
              descontoPercentual: Math.max(0, Math.min(100, Number(e.target.value) || 0)),
            })
          }
          className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-700">
        <input
          type="checkbox"
          checked={value.freteGratis}
          onChange={(e) =>
            onChange({ ...value, freteGratis: e.target.checked })
          }
        />
        Frete grátis
      </label>
      <label className="flex items-center gap-2 text-xs text-zinc-700">
        <input
          type="checkbox"
          checked={value.chanceSorteioPremios}
          onChange={(e) =>
            onChange({ ...value, chanceSorteioPremios: e.target.checked })
          }
        />
        Chance de ser sorteado em prêmios
      </label>
      <label className="block text-xs text-zinc-600">
        Outro benefício (texto)
        <input
          type="text"
          value={value.descricaoExtra}
          onChange={(e) =>
            onChange({ ...value, descricaoExtra: e.target.value })
          }
          placeholder="Ex.: kit exclusivo"
          className="mt-1 w-full rounded-lg border border-zinc-300 px-2 py-1.5 text-sm"
        />
      </label>
    </fieldset>
  );
}

export function RevendedoresAdminPageClient() {
  const [lojas, setLojas] = useState<RevendedorAdmin[]>([]);
  const [niveisPorLoja, setNiveisPorLoja] = useState<
    Record<string, RevendedorComNivel>
  >({});
  const [config, setConfig] = useState<NiveisRevendedorConfig>(
    NIVEIS_REVENDEDOR_DEFAULT,
  );
  const [ouroReais, setOuroReais] = useState("");
  const [prataReais, setPrataReais] = useState("");
  const [emailZenPro, setEmailZenPro] = useState("");
  const [beneficios, setBeneficios] = useState(
    NIVEIS_REVENDEDOR_DEFAULT.beneficios,
  );
  const [rankingPeriodo, setRankingPeriodo] = useState<RankingPeriodo>("mes");
  const [mesFiltro, setMesFiltro] = useState(ymAtual);
  const [semanaFiltro, setSemanaFiltro] = useState(isoWeekAtual);
  const [vendedorFiltro, setVendedorFiltro] = useState("todos");
  const [rankingPeriodoCustom, setRankingPeriodoCustom] = useState<
    RankingItemMes[]
  >([]);
  const [carregandoRankingPeriodo, setCarregandoRankingPeriodo] =
    useState(false);
  const [salvandoNiveis, setSalvandoNiveis] = useState(false);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [msgNiveis, setMsgNiveis] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [lista, cfg] = await Promise.all([
        listarRevendedoresAdmin(),
        obterNiveisRevendedorConfig(),
      ]);
      setLojas(lista);
      setConfig(cfg);
      setOuroReais(centavosParaReaisInput(cfg.ouroMinCentavos));
      setPrataReais(centavosParaReaisInput(cfg.prataMinCentavos));
      setEmailZenPro(cfg.emailContatoZenPro);
      setBeneficios(cfg.beneficios);
      const mapa = await listarNiveisRevendedores(
        lista.map((l) => ({
          lojaId: l.lojaId,
          donoUid: l.donoUid,
          nome: l.nome,
        })),
        cfg,
      );
      setNiveisPorLoja(mapa);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao carregar revendedores.",
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  useEffect(() => {
    if (
      (rankingPeriodo !== "mes" && rankingPeriodo !== "semana") ||
      lojas.length === 0
    ) {
      setRankingPeriodoCustom([]);
      return;
    }

    let cancelled = false;
    setCarregandoRankingPeriodo(true);

    const revendedores = lojas.map((l) => ({
      lojaId: l.lojaId,
      donoUid: l.donoUid,
      nome: l.nome,
    }));

    const carregar =
      rankingPeriodo === "mes"
        ? (() => {
            const parsed = parseYm(mesFiltro);
            if (!parsed) return null;
            return rankingRevendedoresNoMes(
              revendedores,
              parsed.ano,
              parsed.mesIndex0,
              config,
            );
          })()
        : (() => {
            const intervalo = intervaloIsoWeek(semanaFiltro);
            if (!intervalo) return null;
            return rankingRevendedoresNoIntervalo(
              revendedores,
              intervalo.inicio,
              intervalo.fim,
              config,
            );
          })();

    if (!carregar) {
      setCarregandoRankingPeriodo(false);
      return;
    }

    void carregar
      .then((rows) => {
        if (!cancelled) setRankingPeriodoCustom(rows);
      })
      .catch((e) => console.error(e))
      .finally(() => {
        if (!cancelled) setCarregandoRankingPeriodo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rankingPeriodo, mesFiltro, semanaFiltro, lojas, config]);

  const rankingBase = useMemo(() => {
    if (rankingPeriodo === "mes" || rankingPeriodo === "semana") {
      return rankingPeriodoCustom;
    }
    return rankingRevendedores(niveisPorLoja, rankingPeriodo);
  }, [rankingPeriodo, rankingPeriodoCustom, niveisPorLoja]);

  const ranking = useMemo(() => {
    if (vendedorFiltro === "todos") return rankingBase;
    return rankingBase.filter((r) => r.lojaId === vendedorFiltro);
  }, [rankingBase, vendedorFiltro]);

  async function salvarNiveis(e: React.FormEvent) {
    e.preventDefault();
    setMsgNiveis(null);
    setErro(null);
    const ouro = reaisInputParaCentavos(ouroReais);
    const prata = reaisInputParaCentavos(prataReais);
    if (ouro == null || prata == null) {
      setErro("Informe valores válidos para Ouro e Prata (ex.: 10000,00).");
      return;
    }
    setSalvandoNiveis(true);
    try {
      await salvarNiveisRevendedorConfig({
        ouroMinCentavos: ouro,
        prataMinCentavos: prata,
        emailContatoZenPro: emailZenPro.trim(),
        beneficios,
      });
      setMsgNiveis("Níveis e benefícios salvos.");
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar níveis.");
    } finally {
      setSalvandoNiveis(false);
    }
  }

  return (
    <AdminShell
      titulo="Revendedores"
      subtitulo="Níveis, benefícios, métricas e lojas"
    >
      <form
        onSubmit={(ev) => void salvarNiveis(ev)}
        className="mb-8 space-y-4 rounded-2xl border border-amber-200 bg-amber-50/40 p-5 shadow-sm"
      >
        <div>
          <h2 className="text-base font-semibold text-zinc-900">
            Níveis e benefícios
          </h2>
          <p className="mt-1 text-sm text-zinc-600">
            Volume = compras pagas na Zen Pro (site do revendedor + reposição).
            Cadastre metas e o que cada nível ganha.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Ouro a partir de (R$)
            </span>
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="10000,00"
              value={ouroReais}
              onChange={(e) => setOuroReais(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Prata a partir de (R$)
            </span>
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="5000,00"
              value={prataReais}
              onChange={(e) => setPrataReais(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5"
            />
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">
              E-mail Zen Pro (frete / contato)
            </span>
            <input
              type="email"
              placeholder="contato@zenpro.com.br"
              value={emailZenPro}
              onChange={(e) => setEmailZenPro(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white px-3 py-2.5"
            />
          </label>
        </div>

        <div className="grid gap-3 lg:grid-cols-3">
          <BeneficioEditor
            titulo="Benefícios Ouro"
            value={beneficios.ouro}
            onChange={(next) => setBeneficios((b) => ({ ...b, ouro: next }))}
          />
          <BeneficioEditor
            titulo="Benefícios Prata"
            value={beneficios.prata}
            onChange={(next) => setBeneficios((b) => ({ ...b, prata: next }))}
          />
          <BeneficioEditor
            titulo="Benefícios Bronze"
            value={beneficios.bronze}
            onChange={(next) => setBeneficios((b) => ({ ...b, bronze: next }))}
          />
        </div>

        <button
          type="submit"
          disabled={salvandoNiveis}
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {salvandoNiveis ? "Salvando…" : "Salvar níveis e benefícios"}
        </button>
        {msgNiveis && (
          <p className="text-sm text-emerald-700">{msgNiveis}</p>
        )}
      </form>

      <section className="mb-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-base font-semibold text-zinc-900">
            Métricas e ranking
          </h2>
          <div className="flex rounded-xl border border-zinc-200 p-1">
            {(
              [
                ["semana", "Semana"],
                ["mes", "Mês"],
                ["ano", "Ano"],
                ["total", "Total"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setRankingPeriodo(id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
                  rankingPeriodo === id
                    ? "bg-zinc-900 text-white"
                    : "text-zinc-600 hover:bg-zinc-50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-1 text-sm text-zinc-600">
          Quem mais comprou na Zen Pro no período selecionado.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          {rankingPeriodo === "semana" && (
            <label className="block text-xs font-medium text-zinc-600">
              Semana
              <input
                type="week"
                value={semanaFiltro}
                onChange={(e) => setSemanaFiltro(e.target.value)}
                className="mt-1 block rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </label>
          )}
          {rankingPeriodo === "mes" && (
            <label className="block text-xs font-medium text-zinc-600">
              Mês
              <input
                type="month"
                value={mesFiltro}
                onChange={(e) => setMesFiltro(e.target.value)}
                className="mt-1 block rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
              />
            </label>
          )}
          <label className="block min-w-[12rem] flex-1 text-xs font-medium text-zinc-600">
            Vendedor
            <select
              value={vendedorFiltro}
              onChange={(e) => setVendedorFiltro(e.target.value)}
              className="mt-1 block w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900"
            >
              <option value="todos">Todos os revendedores</option>
              {lojas.map((l) => (
                <option key={l.lojaId} value={l.lojaId}>
                  {l.nome}
                </option>
              ))}
            </select>
          </label>
        </div>

        {carregando ||
        ((rankingPeriodo === "mes" || rankingPeriodo === "semana") &&
          carregandoRankingPeriodo) ? (
          <p className="mt-4 text-sm text-zinc-500">Carregando…</p>
        ) : ranking.length === 0 ? (
          <p className="mt-4 text-sm text-zinc-500">
            Sem vendas no filtro selecionado.
          </p>
        ) : (
          <ol className="mt-4 divide-y divide-zinc-100">
            {ranking.map((r, i) => {
              let vol: number;
              if (rankingPeriodo === "mes" || rankingPeriodo === "semana") {
                vol =
                  "volumePeriodoCentavos" in r
                    ? Number(r.volumePeriodoCentavos)
                    : r.volumeMesCentavos;
              } else if (rankingPeriodo === "ano") {
                vol = r.volumeAnoCentavos;
              } else {
                vol = r.volumeCentavos;
              }
              const pedidosPeriodo =
                (rankingPeriodo === "mes" || rankingPeriodo === "semana") &&
                "pedidosPeriodo" in r
                  ? Number(r.pedidosPeriodo)
                  : null;
              const rotuloPedidosPeriodo =
                rankingPeriodo === "semana" ? "na semana" : "no mês";
              return (
                <li
                  key={r.lojaId}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-900 text-xs font-bold text-white">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-zinc-900">{r.nome}</p>
                      <p className="text-xs text-zinc-500">
                        Mês atual {formatarPreco(r.volumeMesCentavos)} · Ano{" "}
                        {formatarPreco(r.volumeAnoCentavos)} · Total{" "}
                        {formatarPreco(r.volumeCentavos)}
                        {pedidosPeriodo != null
                          ? ` · ${pedidosPeriodo} pedido(s) ${rotuloPedidosPeriodo}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeNivel(r.nivel)}`}
                    >
                      {rotuloNivelRevendedor(r.nivel)}
                    </span>
                    <span className="text-sm font-semibold tabular-nums text-zinc-900">
                      {formatarPreco(vol)}
                    </span>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">{lojas.length} loja(s)</p>
        <Link
          href="/admin/revendedores/novo"
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
        >
          Novo revendedor
        </Link>
      </div>

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <div className="overflow-x-auto overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b border-zinc-200 bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
              <tr>
                <th className="px-4 py-3">Loja</th>
                <th className="px-4 py-3">Nível</th>
                <th className="px-4 py-3">Mês</th>
                <th className="px-4 py-3">Ano</th>
                <th className="px-4 py-3">Total</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {lojas.map((loja) => {
                const nv = niveisPorLoja[loja.lojaId];
                return (
                  <tr key={loja.lojaId}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{loja.nome}</p>
                      <p className="text-xs text-zinc-500">{loja.donoEmail}</p>
                    </td>
                    <td className="px-4 py-3">
                      {nv ? (
                        <span
                          className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeNivel(nv.nivel)}`}
                        >
                          {rotuloNivelRevendedor(nv.nivel)}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">
                      {nv ? formatarPreco(nv.volumeMesCentavos) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">
                      {nv ? formatarPreco(nv.volumeAnoCentavos) : "—"}
                    </td>
                    <td className="px-4 py-3 tabular-nums text-zinc-700">
                      {nv ? formatarPreco(nv.volumeCentavos) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      {loja.ativo ? (
                        <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                          Ativa
                        </span>
                      ) : (
                        <span className="rounded-full bg-zinc-200 px-2 py-0.5 text-xs font-medium text-zinc-700">
                          Inativa
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/admin/revendedores/editar?id=${loja.lojaId}`}
                        className="text-xs font-medium text-violet-700 underline"
                      >
                        Editar
                      </Link>
                      <button
                        type="button"
                        className="ml-3 text-xs text-zinc-600 hover:text-zinc-900"
                        onClick={() =>
                          void alternarAtivoRevendedorAdmin(
                            loja.lojaId,
                            !loja.ativo,
                          ).then(carregar)
                        }
                      >
                        {loja.ativo ? "Desativar" : "Ativar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
              {lojas.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-4 py-8 text-center text-zinc-500"
                  >
                    Nenhum revendedor cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </AdminShell>
  );
}
