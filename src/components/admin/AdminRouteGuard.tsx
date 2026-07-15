"use client";

import { useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  adminHomePath,
  revendedorPodeAcessarLoja,
  revendedorPodeAcessarPainelMarca,
} from "@/features/admin/adminAuthService";
import { useAuthAdmin } from "@/features/admin/AdminAuthProvider";

function rotaPedidosAdmin(pathname: string): boolean {
  return pathname.startsWith("/admin/pedidos");
}

function rotaDashboardAdmin(pathname: string): boolean {
  return pathname === "/admin";
}

function revendedorRotaPermitida(
  pathname: string,
  _lojaId: string | null,
): boolean {
  if (rotaDashboardAdmin(pathname)) return true;
  if (rotaPedidosAdmin(pathname)) return true;
  // Pedidos de catálogo: site /revendedor. Estoque só da marca.
  return false;
}

type Props = {
  children: ReactNode;
  /** lojaId da rota /admin/lojas/[lojaId] — omitir na visão geral */
  lojaIdRota?: string;
};

export function AdminRouteGuard({ children, lojaIdRota }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, sessao, carregando } = useAuthAdmin();

  useEffect(() => {
    if (carregando) return;

    if (!user || !sessao) {
      const redirect = encodeURIComponent(pathname);
      router.replace(`/admin/login?redirect=${redirect}`);
      return;
    }

    if (lojaIdRota) {
      if (!revendedorPodeAcessarLoja(sessao, lojaIdRota)) {
        router.replace(adminHomePath(sessao.papel, sessao.lojaId));
      }
      return;
    }

    if (
      !revendedorPodeAcessarPainelMarca(sessao) &&
      !revendedorRotaPermitida(pathname, sessao.lojaId)
    ) {
      router.replace(adminHomePath(sessao.papel, sessao.lojaId));
    }
  }, [carregando, user, sessao, lojaIdRota, pathname, router]);

  if (carregando) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-zinc-500">
        Verificando acesso...
      </div>
    );
  }

  if (!user || !sessao) return null;

  if (lojaIdRota && !revendedorPodeAcessarLoja(sessao, lojaIdRota)) {
    return null;
  }

  if (
    !lojaIdRota &&
    !revendedorPodeAcessarPainelMarca(sessao) &&
    !revendedorRotaPermitida(pathname, sessao.lojaId)
  ) {
    return null;
  }

  return children;
}
