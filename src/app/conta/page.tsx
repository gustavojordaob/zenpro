"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { PERFIL_VAZIO, UFS_BR } from "@/features/usuario/perfilTypes";
import { normalizarNomeMunicipio } from "@/features/usuario/enderecoUtils";
import {
  buscarEnderecoPorCep,
  cpfValido,
  formatarCep,
  formatarCpf,
  formatarTelefone,
  perfilCompleto,
  type EnderecoViaCep,
} from "@/features/usuario/perfilUtils";
import { usePerfilUsuario } from "@/features/usuario/usePerfilUsuario";
import { PerfilIndiceOcupadoError } from "@/features/usuario/perfilIndices";

function ContaForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const { user, carregando: authCarregando } = useAuth();
  const { perfil, carregando: perfilCarregando, salvar } = usePerfilUsuario(user);

  const [form, setForm] = useState(PERFIL_VAZIO);
  const [salvando, setSalvando] = useState(false);
  const [buscandoCep, setBuscandoCep] = useState(false);
  const [enderecoCep, setEnderecoCep] = useState<EnderecoViaCep | null>(null);
  const [erroCep, setErroCep] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  useEffect(() => {
    if (authCarregando) return;
    if (!user) {
      router.replace(`/login?redirect=/conta`);
    }
  }, [authCarregando, user, router]);

  useEffect(() => {
    if (!perfil) return;
    setForm({
      nomeCompleto: perfil.nomeCompleto,
      cpf: formatarCpf(perfil.cpf),
      telefone: formatarTelefone(perfil.telefone),
      cep: formatarCep(perfil.cep),
      logradouro: perfil.logradouro,
      numero: perfil.numero,
      complemento: perfil.complemento,
      bairro: perfil.bairro,
      cidade: normalizarNomeMunicipio(perfil.cidade, perfil.estado),
      estado: perfil.estado,
    });
    if (perfil.cep.replace(/\D/g, "").length === 8) {
      void buscarEnderecoPorCep(perfil.cep).then((endereco) => {
        if (endereco) setEnderecoCep(endereco);
      });
    }
  }, [perfil]);

  async function preencherEnderecoPorCep(cep: string) {
    setErroCep(null);
    setBuscandoCep(true);
    try {
      const endereco = await buscarEnderecoPorCep(cep);
      if (!endereco) {
        setEnderecoCep(null);
        setErroCep("CEP não encontrado.");
        return;
      }
      setEnderecoCep(endereco);
      setForm((prev) => ({
        ...prev,
        logradouro: endereco.logradouro || prev.logradouro,
        bairro: endereco.bairro || prev.bairro,
        cidade: endereco.cidade,
        estado: endereco.estado,
      }));
    } finally {
      setBuscandoCep(false);
    }
  }

  async function handleCepBlur() {
    await preencherEnderecoPorCep(form.cep);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);
    setSucesso(false);

    if (!cpfValido(form.cpf)) {
      setErro("CPF inválido.");
      return;
    }

    if (!perfilCompleto(form)) {
      setErro("Preencha todos os campos obrigatórios.");
      return;
    }

    if (!enderecoCep) {
      setErro("Informe um CEP válido para preencher cidade e UF automaticamente.");
      return;
    }

    setSalvando(true);
    try {
      await salvar(form);
      setSucesso(true);
      if (redirect !== "/") {
        setTimeout(() => router.push(redirect), 600);
      }
    } catch (error) {
      console.error(error);
      if (error instanceof PerfilIndiceOcupadoError) {
        setErro(error.message);
      } else if (
        error instanceof Error &&
        (error.message.includes("permission") ||
          error.message.includes("Permission"))
      ) {
        setErro(
          "Sem permissão para salvar. Confirme login e deploy das Firestore Rules.",
        );
      } else {
        setErro("Não foi possível salvar seus dados. Tente novamente.");
      }
    } finally {
      setSalvando(false);
    }
  }

  if (authCarregando || perfilCarregando || !user) {
    return (
      <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
        Carregando...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto max-w-2xl px-4 pb-12 pt-6 sm:px-6 sm:pt-8">
        <PageBackLink href="/" />

        <h1 className="mt-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
          Minha conta
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Seus dados para entrega e nota fiscal.
        </p>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-8 space-y-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Dados pessoais
            </legend>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">
                Nome completo *
              </span>
              <input
                type="text"
                required
                value={form.nomeCompleto}
                onChange={(e) =>
                  setForm((p) => ({ ...p, nomeCompleto: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">E-mail *</span>
              <input
                type="email"
                readOnly
                value={user.email ?? ""}
                className="w-full cursor-not-allowed rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-zinc-700 outline-none"
                aria-describedby="conta-email-hint"
              />
              <span id="conta-email-hint" className="text-xs text-zinc-500">
                E-mail da conta de login — usado no pedido e na entrega
              </span>
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">CPF *</span>
                <input
                  type="text"
                  required
                  inputMode="numeric"
                  placeholder="000.000.000-00"
                  value={form.cpf}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cpf: formatarCpf(e.target.value) }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  Telefone *
                </span>
                <input
                  type="tel"
                  required
                  placeholder="(11) 99999-9999"
                  value={form.telefone}
                  onChange={(e) =>
                    setForm((p) => ({
                      ...p,
                      telefone: formatarTelefone(e.target.value),
                    }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </label>
            </div>
          </fieldset>

          <fieldset className="space-y-4">
            <legend className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Endereço de entrega
            </legend>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">CEP *</span>
              <input
                type="text"
                required
                inputMode="numeric"
                placeholder="00000-000"
                value={form.cep}
                onChange={(e) => {
                  const cep = formatarCep(e.target.value);
                  setForm((p) => ({ ...p, cep }));
                  setEnderecoCep(null);
                  setErroCep(null);
                }}
                onBlur={() => void handleCepBlur()}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
              />
              {buscandoCep && (
                <span className="text-xs text-zinc-500">Buscando CEP...</span>
              )}
              {erroCep && (
                <span className="text-xs text-red-600">{erroCep}</span>
              )}
              {enderecoCep && (
                <span className="text-xs text-emerald-700">
                  Cidade e UF preenchidos pelo CEP — não edite manualmente.
                </span>
              )}
            </label>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">
                Rua / Avenida *
              </span>
              <input
                type="text"
                required
                value={form.logradouro}
                onChange={(e) =>
                  setForm((p) => ({ ...p, logradouro: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  Número *
                </span>
                <input
                  type="text"
                  required
                  value={form.numero}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, numero: e.target.value }))
                  }
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  Complemento
                </span>
                <input
                  type="text"
                  value={form.complemento}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, complemento: e.target.value }))
                  }
                  placeholder="Apto, bloco..."
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
                />
              </label>
            </div>

            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Bairro *</span>
              <input
                type="text"
                required
                value={form.bairro}
                onChange={(e) =>
                  setForm((p) => ({ ...p, bairro: e.target.value }))
                }
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-[1fr_120px]">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  Cidade *
                </span>
                <input
                  type="text"
                  required
                  readOnly={Boolean(enderecoCep)}
                  value={form.cidade}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, cidade: e.target.value }))
                  }
                  className={`w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900 ${
                    enderecoCep ? "cursor-not-allowed bg-zinc-50" : ""
                  }`}
                />
              </label>

              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">UF *</span>
                <select
                  required
                  disabled={Boolean(enderecoCep)}
                  value={form.estado}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, estado: e.target.value }))
                  }
                  className={`w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none focus:ring-2 focus:ring-zinc-900 ${
                    enderecoCep ? "cursor-not-allowed bg-zinc-50" : ""
                  }`}
                >
                  <option value="">—</option>
                  {UFS_BR.map((uf) => (
                    <option key={uf} value={uf}>
                      {uf}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </fieldset>

          {erro && <p className="text-sm text-red-600">{erro}</p>}
          {sucesso && (
            <p className="text-sm text-emerald-700">
              Dados salvos com sucesso!
              {redirect !== "/" && " Redirecionando..."}
            </p>
          )}

          <button
            type="submit"
            disabled={salvando}
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar dados"}
          </button>
        </form>

        {redirect === "/checkout" && (
          <p className="mt-4 text-center text-sm text-zinc-600">
            Complete seus dados para finalizar a compra.{" "}
            <Link href="/checkout" className="font-medium text-zinc-900 underline">
              Ir ao checkout
            </Link>
          </p>
        )}
      </main>
    </div>
  );
}

export default function ContaPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
          Carregando...
        </div>
      }
    >
      <ContaForm />
    </Suspense>
  );
}
