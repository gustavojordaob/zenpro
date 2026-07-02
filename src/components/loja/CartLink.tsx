"use client";

import Link from "next/link";
import { useCarrinho } from "@/features/loja/CarrinhoProvider";
import { useLojaPaths } from "@/features/loja/useLojaPaths";

export function CartLink() {
  const { quantidade } = useCarrinho();
  const paths = useLojaPaths();

  return (
    <Link
      href={paths.carrinho}
      className="relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-zinc-700 transition hover:bg-zinc-100 hover:text-zinc-900"
      aria-label={`Carrinho, ${quantidade} itens`}
    >
      <CartIcon />
      {quantidade > 0 && (
        <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-zinc-900 px-1 text-[11px] font-semibold text-white">
          {quantidade}
        </span>
      )}
      <span className="hidden text-sm font-medium sm:inline">Carrinho</span>
    </Link>
  );
}

function CartIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      className="h-5 w-5"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 6h15l-1.5 9h-12L6 6z"
      />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6 5 3H2" />
      <circle cx="9" cy="20" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="18" cy="20" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}
