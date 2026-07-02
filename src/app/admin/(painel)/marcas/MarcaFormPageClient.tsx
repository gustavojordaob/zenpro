"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  atualizarMarcaAdmin,
  criarMarcaAdmin,
  obterMarcaAdmin,
} from "@/features/admin/catalogo/marcaAdminService";

type Props = { marcaId?: string };

export function MarcaFormPageClient({ marcaId }: Props) {
  const router = useRouter();
  const [nome, setNome] = useState("");
  const [ativo, setAtivo] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!marcaId) return;
    void obterMarcaAdmin(marcaId).then((m) => {
      if (!m) return setErro("Marca não encontrada.");
      setNome(m.nome);
      setAtivo(m.ativo);
    });
  }, [marcaId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSalvando(true);
    try {
      const input = { nome, ativo };
      if (marcaId) {
        await atualizarMarcaAdmin(marcaId, input);
        router.push("/admin/marcas");
      } else {
        await criarMarcaAdmin(input);
        router.push("/admin/marcas");
      }
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AdminShell titulo={marcaId ? "Editar marca" : "Nova marca"}>
      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-lg space-y-4 rounded-2xl border bg-white p-6">
        <label className="block space-y-1"><span className="text-sm font-medium">Nome</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required className="w-full rounded-lg border px-3 py-2" />
        </label>
        <label className="flex gap-2 text-sm"><input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo</label>
        {erro && <p className="text-sm text-red-600">{erro}</p>}
        <button type="submit" disabled={salvando} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white">Salvar</button>
        <Link href="/admin/marcas" className="ml-3 text-sm underline">Voltar</Link>
      </form>
    </AdminShell>
  );
}
