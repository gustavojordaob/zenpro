"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { PageBackLink } from "@/components/loja/PageBackLink";
import {
  modeloCatalogoParaCelular,
  modeloParaVisualAssets,
  obterModeloCatalogo,
} from "@/features/catalogo/catalogoRuntimeService";
import {
  ROTULOS_TIPO_PERSONALIZACAO,
  tipoPersonalizacaoImplementado,
  type TipoPersonalizacao,
} from "@/features/catalogo/types";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { PersonalizarEditor } from "./PersonalizarEditor";

export function PersonalizarPageClient() {
  const paths = useLojaPaths();
  const searchParams = useSearchParams();
  const modeloId = searchParams.get("modelo") ?? "";
  const tipoParam = searchParams.get("tipoPersonalizacao") as TipoPersonalizacao | null;

  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [tipoPersonalizacao, setTipoPersonalizacao] =
    useState<TipoPersonalizacao>("mascara_modelo");
  const [modelo, setModelo] = useState<ReturnType<typeof modeloCatalogoParaCelular> | null>(null);
  const [visualAssets, setVisualAssets] = useState<ReturnType<typeof modeloParaVisualAssets> | null>(null);

  useEffect(() => {
    void (async () => {
      setCarregando(true);
      if (!modeloId) {
        setNaoEncontrado(true);
        setCarregando(false);
        return;
      }
      const catalogo = await obterModeloCatalogo(modeloId);
      if (!catalogo) {
        setNaoEncontrado(true);
        setCarregando(false);
        return;
      }
      setModelo(modeloCatalogoParaCelular(catalogo));
      setVisualAssets(modeloParaVisualAssets(catalogo));
      setTipoPersonalizacao(tipoParam ?? "mascara_modelo");
      setNaoEncontrado(false);
      setCarregando(false);
    })();
  }, [modeloId, tipoParam]);

  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
        Carregando editor...
      </div>
    );
  }

  if (naoEncontrado || !modelo) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <p className="text-zinc-600">Modelo não encontrado.</p>
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
    <PersonalizarEditor
      modelo={modelo}
      visualAssets={visualAssets!}
      tipoPersonalizacao={tipoPersonalizacao}
    />
  );
}
