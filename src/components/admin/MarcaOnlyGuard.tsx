"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { adminHomePath } from "@/features/admin/adminAuthService";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";

type Props = {
  children: ReactNode;
};

/** Bloqueia revendedor — rotas exclusivas da marca (ex.: CRUD produtos). */
export function MarcaOnlyGuard({ children }: Props) {
  const router = useRouter();
  const { sessao, carregando, user } = useAuthAdmin();

  useEffect(() => {
    if (carregando || !user || !sessao) return;
    if (sessao.papel !== "marca") {
      router.replace(adminHomePath(sessao.papel, sessao.lojaId));
    }
  }, [carregando, user, sessao, router]);

  if (carregando) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Verificando acesso...
      </div>
    );
  }

  if (!sessao || sessao.papel !== "marca") return null;

  return children;
}
