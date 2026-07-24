"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import {
  abrirEmailAprovacaoRevendedor,
} from "@/features/admin/revendedores/emailRevendedorUtils";
import {
  aprovarSolicitacaoRevendedorAdmin,
  listarSolicitacoesRevendedorAdmin,
  recusarSolicitacaoRevendedorAdmin,
  type SolicitacaoRevendedorAdmin,
} from "@/features/admin/revendedores/solicitacaoRevendedorAdminService";
import { formatarCnpj } from "@/features/revendedor/solicitacaoRevendedorUtils";
import type { SolicitacaoRevendedorStatus } from "@/features/revendedor/solicitacaoRevendedorTypes";

const FILTROS: { value: SolicitacaoRevendedorStatus | "todas"; label: string }[] = [
  { value: "pendente", label: "Pendentes" },
  { value: "todas", label: "Todas" },
  { value: "aprovada", label: "Aprovadas" },
  { value: "recusada", label: "Recusadas" },
];

export function SolicitacoesRevendedorAdminPageClient() {
  const { user } = useAuthAdmin();
  const [lista, setLista] = useState<SolicitacaoRevendedorAdmin[]>([]);
  const [filtro, setFiltro] = useState<SolicitacaoRevendedorStatus | "todas">("pendente");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [processandoId, setProcessandoId] = useState<string | null>(null);
  const [aprovacao, setAprovacao] = useState<{
    solicitacaoId: string;
    lojaId: string;
    senha: string | null;
    contaExistente: boolean;
    mailtoUrl: string;
    emailEnfileirado: boolean;
  } | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setLista(await listarSolicitacoesRevendedorAdmin(filtro));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, [filtro]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function handleAprovar(id: string) {
    if (!user) return;
    setProcessandoId(id);
    setErro(null);
    try {
      const result = await aprovarSolicitacaoRevendedorAdmin(id, user.uid);
      setAprovacao({
        solicitacaoId: id,
        lojaId: result.lojaId,
        senha: result.senhaProvisoria,
        contaExistente: result.contaExistente,
        mailtoUrl: result.mailtoUrl,
        emailEnfileirado: result.emailEnfileirado,
      });
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao aprovar.");
    } finally {
      setProcessandoId(null);
    }
  }

  async function handleRecusar(id: string) {
    if (!user) return;
    const motivo = window.prompt("Motivo da recusa (opcional):") ?? "";
    setProcessandoId(id);
    setErro(null);
    try {
      await recusarSolicitacaoRevendedorAdmin(id, user.uid, motivo);
      await carregar();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao recusar.");
    } finally {
      setProcessandoId(null);
    }
  }

  return (
    <AdminShell
      titulo="Solicitações de revendedor"
      subtitulo="Analise candidatos e crie a loja ao aprovar"
    >
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            type="button"
            onClick={() => setFiltro(f.value)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium ${
              filtro === f.value
                ? "bg-zinc-900 text-white"
                : "border border-zinc-300 text-zinc-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {aprovacao && (
        <div className="mb-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="font-semibold text-emerald-900">Revendedor aprovado!</p>
          <p className="mt-2 text-sm text-emerald-800">
            {aprovacao.emailEnfileirado
              ? "E-mail com login e guia de uso enviado automaticamente ao candidato."
              : "Não foi possível enviar o e-mail automaticamente. Use o botão abaixo para enviar manualmente."}
          </p>
          <p className="mt-2 text-sm text-emerald-800">
            Loja <strong>{aprovacao.lojaId}</strong> criada.
            {aprovacao.contaExistente ? (
              <> O candidato já tinha conta de cliente — ele entra com a <strong>senha atual</strong>.</>
            ) : (
              <>
                {" "}
                Senha provisória:{" "}
                <code className="rounded bg-white px-2 py-0.5">{aprovacao.senha}</code>
              </>
            )}
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {!aprovacao.emailEnfileirado && (
              <button
                type="button"
                onClick={() => abrirEmailAprovacaoRevendedor(aprovacao.mailtoUrl)}
                className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white"
              >
                Enviar e-mail manualmente
              </button>
            )}
            <button
              type="button"
              onClick={() => setAprovacao(null)}
              className="rounded-xl border border-zinc-300 px-4 py-2 text-sm"
            >
              Fechar
            </button>
          </div>
          {!aprovacao.emailEnfileirado && (
            <p className="mt-2 text-xs text-emerald-700">
              Configure RESEND_API_KEY nas Cloud Functions para envio automático.
            </p>
          )}
        </div>
      )}

      {erro && (
        <p className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      )}

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando...</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-zinc-500">Nenhuma solicitação encontrada.</p>
      ) : (
        <div className="space-y-4">
          {lista.map((s) => (
            <article
              key={s.id}
              className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold text-zinc-900">
                    {s.razaoSocial || s.nomeLoja}
                  </h2>
                  <p className="text-sm text-zinc-600">
                    {s.nomeCompleto} · {s.email} · {s.telefone}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    CNPJ {formatarCnpj(s.cnpj)}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {s.cidade}/{s.uf}
                  </p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {s.logradouro}, {s.numero}
                    {s.complemento ? ` — ${s.complemento}` : ""} · {s.bairro} · CEP{" "}
                    {s.cep}
                  </p>
                  {s.observacao && (
                    <p className="mt-2 text-sm text-zinc-600">Obs: {s.observacao}</p>
                  )}
                </div>
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    s.status === "pendente"
                      ? "bg-amber-100 text-amber-900"
                      : s.status === "aprovada"
                        ? "bg-emerald-100 text-emerald-900"
                        : "bg-zinc-200 text-zinc-700"
                  }`}
                >
                  {s.status}
                </span>
              </div>

              {s.status === "pendente" && (
                <div className="mt-4 flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={processandoId === s.id}
                    onClick={() => void handleAprovar(s.id)}
                    className="rounded-xl bg-zinc-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  >
                    {processandoId === s.id ? "Processando..." : "Aprovar e criar loja"}
                  </button>
                  <button
                    type="button"
                    disabled={processandoId === s.id}
                    onClick={() => void handleRecusar(s.id)}
                    className="rounded-xl border border-zinc-300 px-4 py-2 text-sm text-zinc-800"
                  >
                    Recusar
                  </button>
                </div>
              )}

              {s.status === "aprovada" && s.lojaIdCriada && (
                <p className="mt-3 text-sm text-emerald-700">
                  Loja criada: <strong>{s.lojaIdCriada}</strong>
                </p>
              )}
              {s.status === "recusada" && s.motivoRecusa && (
                <p className="mt-3 text-sm text-zinc-600">
                  Motivo: {s.motivoRecusa}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </AdminShell>
  );
}
