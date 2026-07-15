"use client";

import Link from "next/link";
import { useAuth } from "@/features/auth/AuthProvider";
import { usePapelUsuario } from "@/features/auth/PapelUsuarioProvider";

type Props = {
  className?: string;
  children?: React.ReactNode;
  onClick?: () => void;
};

/**
 * Se logado → /revendedor (o Guard espera o papel e decide).
 * Se anônimo → login com redirect. Nunca manda para ?aviso= enquanto o papel
 * ainda carrega (evita bounce falso de "somente-revendedor").
 */
export function EntrarComoRevendedorLink({
  className,
  children,
  onClick,
}: Props) {
  const { user, carregando: authCarregando } = useAuth();
  const { carregando: papelCarregando } = usePapelUsuario();

  const carregando = authCarregando || papelCarregando;

  const href = user
    ? "/revendedor"
    : `/login?redirect=${encodeURIComponent("/revendedor")}`;

  return (
    <Link
      href={href}
      className={className}
      onClick={onClick}
      aria-busy={carregando}
    >
      {children ?? "Entrar como revendedor"}
    </Link>
  );
}
