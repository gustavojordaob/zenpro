"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { criarRevendedorAdmin } from "@/features/admin/revendedores/revendedorAdminService";
import { normalizarSlugLoja } from "@/features/admin/revendedores/revendedorAdminUtils";

export function RevendedorNovoPageClient() {
  const router = useRouter();
  const [nomeLoja, setNomeLoja] = useState("");
  const [slug, setSlug] = useState("");
  const [nomeDono, setNomeDono] = useState("");
  const [emailDono, setEmailDono] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState<{
    lojaId: string;
    senhaProvisoria: string | null;
    contaExistente: boolean;
  } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const result = await criarRevendedorAdmin({
        nomeLoja,
        slug: slug || normalizarSlugLoja(nomeLoja),
        emailDono,
        nomeDono,
      });
      setSucesso(result);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao criar revendedor.",
      );
    } finally {
      setSalvando(false);
    }
  }

  if (sucesso) {
    return (
      <AdminShell titulo="Revendedor criado" subtitulo={sucesso.lojaId}>
        <div className="max-w-lg space-y-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-6">
          <p className="text-sm text-emerald-900">
            Loja <strong>{sucesso.lojaId}</strong> criada com sucesso.
          </p>
          <div className="rounded-xl border border-emerald-300 bg-white p-4">
            {sucesso.contaExistente ? (
              <>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Conta existente
                </p>
                <p className="mt-2 text-sm text-zinc-700">
                  Este e-mail já tinha cadastro de cliente. O dono entra no admin
                  com a <strong>senha atual</strong> dele.
                </p>
              </>
            ) : (
              <>
                <p className="text-xs font-semibold uppercase text-zinc-500">
                  Senha provisória do dono
                </p>
                <p className="mt-1 font-mono text-lg text-zinc-900">
                  {sucesso.senhaProvisoria}
                </p>
                <p className="mt-2 text-xs text-zinc-600">
                  Envie esta senha ao revendedor. Ele deve trocar no primeiro acesso.
                </p>
              </>
            )}
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href={`/admin/revendedores/editar?id=${sucesso.lojaId}`}
              className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Editar branding
            </Link>
            <Link
              href="/admin/revendedores"
              className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              Voltar à lista
            </Link>
          </div>
        </div>
      </AdminShell>
    );
  }

  return (
    <AdminShell titulo="Novo revendedor" subtitulo="Cria loja + conta do dono">
      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-5">
        {erro && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {erro}
          </p>
        )}

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Nome da loja</span>
          <input
            required
            value={nomeLoja}
            onChange={(e) => {
              setNomeLoja(e.target.value);
              if (!slug) setSlug(normalizarSlugLoja(e.target.value));
            }}
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">
            Slug (URL única)
          </span>
          <div className="mt-1 flex items-center gap-1 text-sm text-zinc-500">
            <span>/</span>
            <input
              required
              value={slug}
              onChange={(e) => setSlug(normalizarSlugLoja(e.target.value))}
              className="flex-1 rounded-xl border border-zinc-300 px-3 py-2.5 text-sm text-zinc-900"
              placeholder="minha-loja"
            />
          </div>
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">Nome do dono</span>
          <input
            required
            value={nomeDono}
            onChange={(e) => setNomeDono(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
          />
        </label>

        <label className="block">
          <span className="text-sm font-medium text-zinc-700">E-mail do dono</span>
          <input
            required
            type="email"
            value={emailDono}
            onChange={(e) => setEmailDono(e.target.value)}
            className="mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm"
          />
        </label>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={salvando}
            className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
          >
            {salvando ? "Criando..." : "Criar revendedor"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/revendedores")}
            className="rounded-xl border border-zinc-300 px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
          >
            Cancelar
          </button>
        </div>
      </form>
    </AdminShell>
  );
}
