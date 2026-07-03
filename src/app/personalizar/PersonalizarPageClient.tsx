"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { carregarContextoPersonalizacao } from "@/features/catalogo/personalizacaoContext";
import {
  ROTULOS_TIPO_PERSONALIZACAO,
  tipoPersonalizacaoImplementado,
  type TipoPersonalizacao,
} from "@/features/catalogo/types";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { PersonalizacaoVisualProvider } from "@/features/personalizacao/PersonalizacaoVisualContext";
import { PersonalizarEditor } from "./PersonalizarEditor";

export function PersonalizarPageClient() {
  const paths = useLojaPaths();
  const searchParams = useSearchParams();
  const modeloId = searchParams.get("modelo") ?? "";
  const produtoId = searchParams.get("produto");
  const tipoParam = searchParams.get("tipoPersonalizacao") as TipoPersonalizacao | null;

  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [tipoPersonalizacao, setTipoPersonalizacao] =
    useState<TipoPersonalizacao>("mascara_modelo");
  const [ctx, setCtx] = useState<Awaited<
    ReturnType<typeof carregarContextoPersonalizacao>
  > | null>(null);

  useEffect(() => {
    void (async () => {
      setCarregando(true);
      if (!modeloId) {
        setNaoEncontrado(true);
        setCarregando(false);
        return;
      }

      const contexto = await carregarContextoPersonalizacao(modeloId, produtoId);
      if (!contexto) {
        setNaoEncontrado(true);
        setCarregando(false);
        return;
      }

      setCtx(contexto);
      setTipoPersonalizacao(tipoParam ?? "mascara_modelo");
      setNaoEncontrado(false);
      setCarregando(false);
    })();
  }, [modeloId, produtoId, tipoParam]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
        Carregando editor...
      </div>
    );
  }

  if (naoEncontrado || !ctx) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-zinc-600">
            {produtoId
              ? "Produto ou modelo não encontrado para esta combinação."
              : "Modelo não encontrado."}
          </p>
          <Link href={paths.home} className="mt-4 inline-block text-sm underline">
            Voltar
          </Link>
        </main>
      </div>
    );
  }

  if (!tipoPersonalizacaoImplementado(tipoPersonalizacao)) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <PageBackLink href={paths.home} />
          <h1 className="mt-6 text-xl font-bold text-zinc-900">Em breve</h1>
          <p className="mt-2 text-zinc-600">
            Personalização{" "}
            <strong>{ROTULOS_TIPO_PERSONALIZACAO[tipoPersonalizacao]}</strong> ainda
            não está disponível.
          </p>
          <Link
            href={paths.home}
            className="mt-6 inline-block rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white"
          >
            Voltar à loja
          </Link>
        </main>
      </div>
    );
  }

  return (
    <PersonalizacaoVisualProvider visual={ctx.visual}>
      <PersonalizarEditor
        contexto={ctx}
        tipoPersonalizacao={tipoPersonalizacao}
      />
    </PersonalizacaoVisualProvider>
  );
}
