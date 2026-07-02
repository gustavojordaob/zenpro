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

export function RevendedorEditarPageClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const lojaId = searchParams.get("id") ?? "";

  const [loja, setLoja] = useState<RevendedorAdmin | null>(null);
  const [nome, setNome] = useState("");
  const [cor, setCor] = useState("#18181b");
  const [whatsapp, setWhatsapp] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
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
      await atualizarRevendedorAdmin(
        lojaId,
        {
          nome,
          config: {
            logo: logoUrl,
            cor,
            whatsapp: whatsapp.trim() || null,
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
