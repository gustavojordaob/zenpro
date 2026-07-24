"use client";

import Link from "next/link";
import { useState } from "react";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { enviarSolicitacaoRevendedor } from "@/features/revendedor/solicitacaoRevendedorService";

export function SejaRevendedorPageClient() {
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const [nomeCompleto, setNomeCompleto] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [razaoSocial, setRazaoSocial] = useState("");
  const [cep, setCep] = useState("");
  const [logradouro, setLogradouro] = useState("");
  const [numero, setNumero] = useState("");
  const [complemento, setComplemento] = useState("");
  const [bairro, setBairro] = useState("");
  const [cidade, setCidade] = useState("");
  const [uf, setUf] = useState("");
  const [observacao, setObservacao] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErro(null);
    try {
      await enviarSolicitacaoRevendedor({
        nomeCompleto,
        email,
        telefone,
        cnpj,
        razaoSocial,
        cep,
        logradouro,
        numero,
        complemento,
        bairro,
        cidade,
        uf,
        observacao,
      });
      setSucesso(true);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao enviar solicitação.",
      );
    } finally {
      setEnviando(false);
    }
  }

  if (sucesso) {
    return (
      <>
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Solicitação enviada!</h1>
          <p className="mt-4 text-zinc-600">
            Recebemos seus dados. A equipe Zen Pro vai analisar e, se aprovado,
            você receberá um e-mail com login e senha para acessar o portal
            revendedor.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block rounded-xl bg-zinc-900 px-6 py-3 text-sm font-semibold text-white"
          >
            Voltar ao site
          </Link>
        </main>
      </>
    );
  }

  return (
    <>
      <StoreHeader />
      <main className="bg-zinc-50 py-10">
        <div className="mx-auto max-w-2xl px-4">
          <h1 className="text-3xl font-bold text-zinc-900">Seja um revendedor</h1>
          <p className="mt-2 text-zinc-600">
            Preencha o formulário. Após aprovação, você recebe acesso ao portal
            atacado Zen Pro com catálogo oficial e preços de revenda.
          </p>

          <form
            onSubmit={(e) => void handleSubmit(e)}
            className="mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
          >
            <section className="space-y-4">
              <h2 className="font-semibold text-zinc-900">Responsável</h2>
              <Campo label="Nome completo" required>
                <input
                  required
                  value={nomeCompleto}
                  onChange={(e) => setNomeCompleto(e.target.value)}
                  className={inputCls}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="E-mail" required>
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Telefone / WhatsApp" required>
                  <input
                    required
                    value={telefone}
                    onChange={(e) => setTelefone(e.target.value)}
                    className={inputCls}
                  />
                </Campo>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="font-semibold text-zinc-900">Empresa</h2>
              <Campo label="CNPJ" required>
                <input
                  required
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className={inputCls}
                />
              </Campo>
              <Campo label="Razão social" required>
                <input
                  required
                  value={razaoSocial}
                  onChange={(e) => setRazaoSocial(e.target.value)}
                  className={inputCls}
                />
              </Campo>
            </section>

            <section className="space-y-4">
              <h2 className="font-semibold text-zinc-900">Endereço comercial</h2>
              <div className="grid gap-4 sm:grid-cols-3">
                <Campo label="CEP" required>
                  <input
                    required
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="UF" required>
                  <input
                    required
                    maxLength={2}
                    value={uf}
                    onChange={(e) => setUf(e.target.value.toUpperCase())}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Cidade" required>
                  <input
                    required
                    value={cidade}
                    onChange={(e) => setCidade(e.target.value)}
                    className={inputCls}
                  />
                </Campo>
              </div>
              <Campo label="Logradouro" required>
                <input
                  required
                  value={logradouro}
                  onChange={(e) => setLogradouro(e.target.value)}
                  className={inputCls}
                />
              </Campo>
              <div className="grid gap-4 sm:grid-cols-2">
                <Campo label="Número" required>
                  <input
                    required
                    value={numero}
                    onChange={(e) => setNumero(e.target.value)}
                    className={inputCls}
                  />
                </Campo>
                <Campo label="Complemento">
                  <input
                    value={complemento}
                    onChange={(e) => setComplemento(e.target.value)}
                    className={inputCls}
                  />
                </Campo>
              </div>
              <Campo label="Bairro" required>
                <input
                  required
                  value={bairro}
                  onChange={(e) => setBairro(e.target.value)}
                  className={inputCls}
                />
              </Campo>
            </section>

            <Campo label="Observações (opcional)">
              <textarea
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                rows={3}
                className={inputCls}
              />
            </Campo>

            {erro && (
              <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {erro}
              </p>
            )}

            <button
              type="submit"
              disabled={enviando}
              className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-60"
            >
              {enviando ? "Enviando..." : "Enviar solicitação"}
            </button>
          </form>
        </div>
      </main>
    </>
  );
}

const inputCls =
  "mt-1 w-full rounded-xl border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-900";

function Campo({
  label,
  hint,
  required,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="font-medium text-zinc-700">
        {label}
        {required && " *"}
      </span>
      {hint && <span className="mt-0.5 block text-xs text-zinc-500">{hint}</span>}
      {children}
    </label>
  );
}
