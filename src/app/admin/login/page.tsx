"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { ZenProLogo } from "@/components/loja/ZenProLogo";
import {
  adminHomePath,
  carregarSessaoAdmin,
} from "@/features/admin/adminAuthService";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";
import { entrarComEmail, sair } from "@/features/auth/authService";
import { BotaoEsqueciSenha } from "@/components/auth/BotaoEsqueciSenha";
import { isFirebaseConfigured } from "@/lib/firebase";

function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get("redirect");
  const { user, sessao, carregando: authCarregando } = useAuthAdmin();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (authCarregando) return;
    if (user && sessao) {
      const destino =
        redirectParam && redirectParam.startsWith("/admin")
          ? redirectParam
          : adminHomePath(sessao.papel, sessao.lojaId);
      router.replace(destino);
    }
  }, [authCarregando, user, sessao, redirectParam, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);

    if (!isFirebaseConfigured()) {
      setErro("Firebase não configurado.");
      return;
    }

    setCarregando(true);
    try {
      const authUser = await entrarComEmail(email, senha);
      const sessaoAdmin = await carregarSessaoAdmin(
        authUser.uid,
        authUser.email,
      );

      if (!sessaoAdmin) {
        await sair();
        setErro(
          "Esta conta não tem permissão de admin (marca ou revendedor).",
        );
        return;
      }

      const destino =
        redirectParam && redirectParam.startsWith("/admin")
          ? redirectParam
          : adminHomePath(sessaoAdmin.papel, sessaoAdmin.lojaId);
      router.replace(destino);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao entrar.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50">
      <div className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6">
        <ZenProLogo variant="dark" className="h-9 w-auto" href="/" />
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-10">
        <h1 className="text-2xl font-bold text-zinc-900">Admin Zen Pro</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Acesso para marca e revendedores.
        </p>

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
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Senha</span>
            <input
              type="password"
              required
              autoComplete="current-password"
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </label>

          <BotaoEsqueciSenha email={email} destino="admin" />

          {erro && <p className="text-sm text-red-600">{erro}</p>}

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-zinc-900 py-3 text-sm font-semibold text-white disabled:opacity-50"
          >
            {carregando ? "Entrando..." : "Entrar no admin"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-zinc-500">
          <Link href="/" className="underline hover:text-zinc-800">
            Voltar à loja
          </Link>
        </p>
      </main>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center text-zinc-500">
          Carregando...
        </div>
      }
    >
      <AdminLoginForm />
    </Suspense>
  );
}
