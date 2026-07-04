"use client";

import { useEffect, useState } from "react";
import { ProductCard } from "@/components/loja/ProductCard";
import { listarProdutosPersonalizaveisAtivos } from "@/features/loja/catalogoProdutos";
import type { ProdutoDestaque } from "@/features/loja/produtosMock";
import { isFirebaseConfigured } from "@/lib/firebase";

export function PersonalizarSection() {
  const [produtos, setProdutos] = useState<ProdutoDestaque[]>([]);
  const [carregando, setCarregando] = useState(isFirebaseConfigured());
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!isFirebaseConfigured()) return;

    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        setProdutos(await listarProdutosPersonalizaveisAtivos());
      } catch (e) {
        console.error(e);
        setErro(
          e instanceof Error ? e.message : "Não foi possível carregar os produtos.",
        );
        setProdutos([]);
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  return (
    <section
      id="personalizar"
      className="border-t border-zinc-200 bg-white"
    >
      <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
            Personalize com sua foto
          </h2>
          <p className="mt-1 text-zinc-600">
            Escolha um produto personalizável e envie sua foto no editor.
          </p>
        </div>

        {erro && (
          <p className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
            {erro.includes("permission") || erro.includes("Permission")
              ? "Erro de permissão ao carregar produtos. Verifique as regras do Firebase."
              : erro}
          </p>
        )}
        {carregando ? (
          <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-600">
            Carregando produtos personalizáveis...
          </p>
        ) : produtos.length === 0 ? (
          <p className="rounded-2xl border border-zinc-200 bg-zinc-50 p-8 text-center text-zinc-600">
            Nenhum produto personalizável disponível no momento.
          </p>
        ) : (
          <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
            {produtos.map((produto) => (
              <li key={produto.id} className="h-full">
                <ProductCard produto={produto} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
