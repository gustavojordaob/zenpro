"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePapelUsuario } from "@/features/auth/PapelUsuarioProvider";
import { StoreHeader } from "@/components/loja/StoreHeader";

const LOGIN = `/login?redirect=${encodeURIComponent("/revendedor")}`;

export function RevendedorB2BGuard({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, carregando: authCarregando } = useAuth();
  const {
    podeAcessarPortalRevendedor,
    carregando: papelCarregando,
    isMarca,
  } = usePapelUsuario();

  const carregando = authCarregando || papelCarregando;

  useEffect(() => {
    if (carregando) return;
    if (!user) {
      router.replace(LOGIN);
    }
  }, [carregando, user, router]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <p className="pt-20 text-center text-sm text-zinc-600">
          Verificando acesso de revendedor…
        </p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-zinc-900">Área do revendedor</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Faça login com a conta aprovada como revendedor.
          </p>
          <Link
            href={LOGIN}
            className="mt-6 inline-block rounded-xl bg-teal-800 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Entrar
          </Link>
        </main>
      </div>
    );
  }

  if (!podeAcessarPortalRevendedor) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-xl font-bold text-zinc-900">
            Conta sem acesso de revendedor
          </h1>
          <p className="mt-2 text-sm text-zinc-600">
            Esta conta não está aprovada como revendedor. Entre com o e-mail
            cadastrado na aprovação ou solicite o acesso.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href="/seja-revendedor"
              className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
            >
              Quero ser revendedor
            </Link>
            <Link
              href="/"
              className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-800"
            >
              Site comum
            </Link>
            <Link
              href="/admin/login"
              className="rounded-xl border border-teal-700 px-5 py-2.5 text-sm font-medium text-teal-900"
            >
              Login admin
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <>
      {isMarca && (
        <div className="bg-amber-100 px-4 py-2 text-center text-xs font-medium text-amber-950">
          Você entrou como marca — visualizando o portal do revendedor.
        </div>
      )}
      {children}
    </>
  );
}
