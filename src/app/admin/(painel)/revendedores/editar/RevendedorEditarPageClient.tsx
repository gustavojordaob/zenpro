"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  atualizarRevendedorAdmin,
  obterRevendedorAdmin,
  type RevendedorAdmin,
} from "@/features/admin/revendedores/revendedorAdminService";
import { uploadLogoLoja } from "@/features/admin/revendedores/uploadLogoLoja";
import {
  EnderecoExpedicaoFields,
  enderecoExpedicaoFromConfig,
  enderecoExpedicaoToConfig,
  type EnderecoExpedicaoForm,
} from "@/components/admin/EnderecoExpedicaoFields";

export function RevendedorEditarPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lojaId = searchParams.get("id") ?? "";

  const [loja, setLoja] = useState<RevendedorAdmin | null>(null);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#18181b");
  const [whatsapp, setWhatsapp] = useState("");
  const [limiteCreditoReais, setLimiteCreditoReais] = useState("");
  const [pedidoMinimoReais, setPedidoMinimoReais] = useState("800");
  const [comissaoPercentual, setComissaoPercentual] = useState("");
  const [prazoLocal, setPrazoLocal] = useState("");
  const [prazoZenPro, setPrazoZenPro] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [expedicao, setExpedicao] = useState<EnderecoExpedicaoForm>(
    enderecoExpedicaoFromConfig(),
  );
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const carregar = useCallback(async () => {
    if (!lojaId) {
      setErro("ID da loja não informado.");
      setCarregando(false);
      return;
    }
    setCarregando(true);
    setErro(null);
    try {
      const data = await obterRevendedorAdmin(lojaId);
      if (!data) {
        setErro("Loja não encontrada.");
        return;
      }
      setLoja(data);
      setNome(data.nome);
      setCor(data.config.cor ?? "#18181b");
      setWhatsapp(data.config.whatsapp ?? "");
      setLogoUrl(data.config.logo ?? null);
      const cfg = data.config;
      setLimiteCreditoReais(
        cfg.limiteCreditoCentavos != null
          ? String(cfg.limiteCreditoCentavos / 100)
          : "",
      );
      setPedidoMinimoReais(
        cfg.pedidoMinimoCentavos != null
          ? String(cfg.pedidoMinimoCentavos / 100)
          : "800",
      );
      setComissaoPercentual(
        cfg.comissaoPercentual != null ? String(cfg.comissaoPercentual) : "",
      );
      setPrazoLocal(
        cfg.prazoEntregaDiasLocal != null
          ? String(cfg.prazoEntregaDiasLocal)
          : "",
      );
      setPrazoZenPro(
        cfg.prazoEntregaDiasZenPro != null
          ? String(cfg.prazoEntregaDiasZenPro)
          : "",
      );
      setExpedicao(enderecoExpedicaoFromConfig(cfg.expedicao));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar loja.");
    } finally {
      setCarregando(false);
    }
  }, [lojaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !lojaId) return;
    setSalvando(true);
    setErro(null);
    try {
      const url = await uploadLogoLoja(lojaId, file);
      setLogoUrl(url);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro no upload.");
    } finally {
      setSalvando(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!lojaId) return;
    setSalvando(true);
    setErro(null);
    setSucesso(false);
    try {
      const parseReais = (v: string) => {
        const n = Number(v.replace(",", "."));
        return Number.isFinite(n) && n > 0 ? Math.round(n * 100) : null;
      };
      const parsePct = (v: string) => {
        const n = Number(v.replace(",", "."));
        return Number.isFinite(n) && n >= 0 ? n : null;
      };
      const parseDias = (v: string) => {
        const n = Number(v);
        return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
      };

      await atualizarRevendedorAdmin(
        lojaId,
        {
          nome,
          config: {
            logo: logoUrl,
            cor,
            whatsapp: whatsapp.trim() || null,
            limiteCreditoCentavos: parseReais(limiteCreditoReais),
            pedidoMinimoCentavos: parseReais(pedidoMinimoReais) ?? 80_000,
            comissaoPercentual: parsePct(comissaoPercentual),
            prazoEntregaDiasLocal: parseDias(prazoLocal),
            prazoEntregaDiasZenPro: parseDias(prazoZenPro),
            expedicao: enderecoExpedicaoToConfig(expedicao),
          },
        },
        false,
      );
      setSucesso(true);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (!lojaId) {
    return (
      <AdminShell titulo="Editar loja">
        <p className="text-sm text-red-600">Parâmetro id ausente.</p>
        <Link href="/admin/revendedores" className="mt-4 inline-block text-sm underline">
          Voltar
        </Link>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      titulo="Editar loja"
      subtitulo={loja ? `${loja.nome} · /${loja.slug}` : lojaId}
    >
      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : (
        <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-5">
          {erro && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {erro}
            </p>
          )}
          {sucesso && (
            <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
              Alterações salvas.
            </p>
          )}

          {loja && (
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4 text-sm text-zinc-600">
              <p>
                Dono: <strong>{loja.donoNome ?? loja.donoEmail}</strong>
              </p>
              <p className="mt-1">E-mail: {loja.donoEmail}</p>
              <p className="mt-1">
                Slug:{" "}
                <a
                  href={`/${loja.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-violet-700 underline"
                >
                  /{loja.slug}
                </a>
              </p>
            </div>
          )}

          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Nome da loja</span>
            <input
              required
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
            />
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700">Cor principal</span>
            <div className="mt-1 flex items-center gap-3">
              <input
                type="color"
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-zinc-300"
              />
              <input
                value={cor}
                onChange={(e) => setCor(e.target.value)}
                className="flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 font-mono text-sm"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-zinc-700">WhatsApp</span>
            <input
              value={whatsapp}
              onChange={(e) => setWhatsapp(e.target.value)}
              placeholder="5511999999999"
              className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
            />
          </label>

          <div>
            <span className="text-sm font-medium text-zinc-700">Logo</span>
            {logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt="Logo da loja"
                className="mt-2 h-16 w-auto rounded-lg border border-zinc-200 bg-white object-contain p-1"
              />
            )}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => void handleLogoChange(e)}
              className="mt-2 block w-full text-sm text-zinc-600"
            />
          </div>

          <fieldset className="space-y-4 rounded-xl border border-zinc-200 bg-zinc-50 p-4">
            <legend className="px-1 text-sm font-semibold text-zinc-800">
              Regras comerciais B2B (Seven / Zen Pro)
            </legend>
            <p className="text-xs text-zinc-600">
              Limite de crédito, pedido mínimo e comissão são definidos pelo
              administrador da marca para cada revendedor.
            </p>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Limite de crédito (R$)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={limiteCreditoReais}
                onChange={(e) => setLimiteCreditoReais(e.target.value)}
                placeholder="Ex.: 5000"
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Pedido mínimo (R$)
              </span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={pedidoMinimoReais}
                onChange={(e) => setPedidoMinimoReais(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-zinc-700">
                Comissão (% por item)
              </span>
              <input
                type="number"
                min={0}
                max={100}
                step="0.1"
                value={comissaoPercentual}
                onChange={(e) => setComissaoPercentual(e.target.value)}
                placeholder="Ex.: 15"
                className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Prazo — estoque do revendedor (dias)
                </span>
                <input
                  type="number"
                  min={1}
                  value={prazoLocal}
                  onChange={(e) => setPrazoLocal(e.target.value)}
                  placeholder="Revendedor define"
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-zinc-700">
                  Prazo — estoque Seven Tech (dias)
                </span>
                <input
                  type="number"
                  min={1}
                  value={prazoZenPro}
                  onChange={(e) => setPrazoZenPro(e.target.value)}
                  placeholder="Ex.: 7"
                  className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
                />
              </label>
            </div>
          </fieldset>

          <EnderecoExpedicaoFields
            value={expedicao}
            onChange={setExpedicao}
            descricao="Usado na etiqueta quando o pedido for só de produtos prontos vendidos nesta loja. Capinhas personalizadas sempre saem da Zen Pro."
          />

          <div className="flex gap-3 pt-2">
            <button
              type="submit"
              disabled={salvando}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {salvando ? "Salvando..." : "Salvar"}
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/revendedores")}
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Voltar
            </button>
          </div>
        </form>
      )}
    </AdminShell>
  );
}
