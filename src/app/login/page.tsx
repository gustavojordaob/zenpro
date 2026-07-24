"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { StoreHeader } from "@/components/loja/StoreHeader";
import {
  criarContaComEmail,
  entrarComEmail,
} from "@/features/auth/authService";
import { BotaoEsqueciSenha } from "@/components/auth/BotaoEsqueciSenha";
import { isFirebaseConfigured } from "@/lib/firebase";

type Modo = "entrar" | "criar";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") ?? "/";

  const [modo, setModo] = useState<Modo>("entrar");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!isFirebaseConfigured()) {
      setErro("Firebase não configurado. Verifique o .env.local.");
      return;
    }

    if (modo === "criar" && senha !== confirmarSenha) {
      setErro("As senhas não coincidem.");
      return;
    }

    setCarregando(true);
    try {
      if (modo === "entrar") {
        await entrarComEmail(email, senha);
      } else {
        await criarContaComEmail(email, senha);
      }
      router.replace(redirect);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao autenticar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto max-w-md px-4 pb-12 pt-6 sm:pt-8">
        <PageBackLink href="/" />

        <h1 className="mt-4 text-2xl font-bold text-zinc-900">
          {modo === "entrar" ? "Entrar" : "Criar conta"}
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Use e-mail e senha para acessar sua conta Zenpro.
        </p>
        {redirect.startsWith("/revendedor") && (
          <p className="mt-3 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-900">
            Área do revendedor — após entrar, só contas aprovadas acessam o
            portal atacado.
          </p>
        )}

        <div className="mt-6 flex rounded-xl bg-zinc-100 p-1">
          <button
            type="button"
            onClick={() => setModo("entrar")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              modo === "entrar"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600"
            }`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setModo("criar")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition ${
              modo === "criar"
                ? "bg-white text-zinc-900 shadow-sm"
                : "text-zinc-600"
            }`}
          >
            Criar conta
          </button>
        </div>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="mt-6 space-y-4 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm"
        >
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">E-mail</span>
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Senha</span>
            <input
              type="password"
              required
              minLength={6}
              autoComplete={
                modo === "entrar" ? "current-password" : "new-password"
              }
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
            />
          </label>

          {modo === "criar" && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">
                Confirmar senha
              </span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={confirmarSenha}
                onChange={(e) => setConfirmarSenha(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-zinc-900 outline-none ring-zinc-900 focus:ring-2"
              />
            </label>
          )}

          {modo === "entrar" && (
            <BotaoEsqueciSenha email={email} destino="loja" />
          )}

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
          >
            {carregando
              ? "Aguarde..."
              : modo === "entrar"
                ? "Entrar"
                : "Criar conta"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          Ao finalizar a compra você precisa estar logado.{" "}
          <Link href="/carrinho" className="font-medium text-zinc-800 underline">
            Ver carrinho
          </Link>
        </p>
        <p className="mt-3 text-center text-sm text-zinc-500">
          É revendedor aprovado?{" "}
          <Link
            href="/revendedor"
            className="font-semibold text-teal-800 underline"
          >
            Entrar no site do revendedor
          </Link>
        </p>
      </main>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
          Carregando...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
