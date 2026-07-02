"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  atualizarTipoAdmin,
  criarTipoAdmin,
  obterTipoAdmin,
} from "@/features/admin/catalogo/tipoAdminService";
import {
  ROTULOS_TIPO_PERSONALIZACAO,
  TIPOS_PERSONALIZACAO,
  type TipoPersonalizacao,
} from "@/features/catalogo/types";

type Props = { tipoId?: string };

export function TipoFormPageClient({ tipoId }: Props) {
  const router = useRouter();
  const editando = Boolean(tipoId);
  const [nome, setNome] = useState("");
  const [tipoPersonalizacao, setTipoPersonalizacao] =
    useState<TipoPersonalizacao>("mascara_modelo");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!tipoId) return;
    void obterTipoAdmin(tipoId).then((tipo) => {
      if (!tipo) {
        setErro("Tipo não encontrado.");
        return;
      }
      setNome(tipo.nome);
      setTipoPersonalizacao(tipo.tipoPersonalizacao);
      setAtivo(tipo.ativo);
    });
  }, [tipoId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    setErro(null);
    try {
      const input = { nome, tipoPersonalizacao, ativo };
      if (editando && tipoId) {
        await atualizarTipoAdmin(tipoId, input);
        router.push("/admin/tipos");
      } else {
        const id = await criarTipoAdmin(input);
        router.push(`/admin/tipos/editar?id=${id}`);
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AdminShell titulo={editando ? "Editar tipo" : "Novo tipo"}>
      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded-lg border border-zinc-300 px-3 py-2" />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Como personaliza</span>
          <select value={tipoPersonalizacao} onChange={(e) => setTipoPersonalizacao(e.target.value as TipoPersonalizacao)} className="w-full rounded-lg border border-zinc-300 px-3 py-2">
            {TIPOS_PERSONALIZACAO.map((t) => (
              <option key={t} value={t}>{ROTULOS_TIPO_PERSONALIZACAO[t]}</option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} />
          Ativo
        </label>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <div className="flex gap-3">
          <button type="submit" disabled={salvando} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
            {salvando ? "Salvando..." : "Salvar"}
          </button>
          <Link href="/admin/tipos" className="rounded-xl border border-zinc-300 px-4 py-2 text-sm">Voltar</Link>
        </div>
      </form>
    </AdminShell>
  );
}
