"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { PersonalizacaoFields } from "@/components/personalizacao/PersonalizacaoFields";
import { TextoCapinhaPanel } from "@/components/personalizacao/TextoCapinhaPanel";
import { RevisarPersonalizacaoModal } from "@/components/personalizacao/RevisarPersonalizacaoModal";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { useAuth } from "@/features/auth/AuthProvider";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { useCarrinho } from "@/features/loja/CarrinhoProvider";
import { salvarPersonalizacao } from "@/features/loja/salvarPersonalizacao";
import { criarTextoPadrao } from "@/features/personalizacao/caseTextFonts";
import { getCaseLayout } from "@/features/personalizacao/caseGeometry";
import { MODELOS } from "@/features/personalizacao/modelos";
import {
  DEFAULT_TRANSFORM,
  type ModeloCelular,
  type Personalizacao,
  type TextoCapinha,
  type Transform,
} from "@/features/personalizacao/types";
import { subirFoto } from "@/features/personalizacao/uploadFoto";
import { isFirebaseConfigured } from "@/lib/firebase";

const CaseEditor = dynamic(
  () =>
    import("@/features/personalizacao/CaseEditor").then((mod) => ({
      default: mod.CaseEditor,
    })),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex h-[653px] w-full max-w-[360px] items-center justify-center rounded-2xl p-5"
        style={{ backgroundColor: "#ececec" }}
      >
        <p className="text-sm text-zinc-500">Carregando editor...</p>
      </div>
    ),
  },
);

type Props = {
  modelo: ModeloCelular;
};

export function PersonalizarEditor({ modelo }: Props) {
  const router = useRouter();
  const { adicionarPersonalizada } = useCarrinho();
  const { user } = useAuth();
  const [fotoUrl, setFotoUrl] = useState<string | null>(null);
  const [transform, setTransform] = useState<Transform>(DEFAULT_TRANSFORM);
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [textos, setTextos] = useState<TextoCapinha[]>([]);
  const [textoSelecionadoId, setTextoSelecionadoId] = useState<string | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [modalRevisao, setModalRevisao] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [comprarError, setComprarError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleTransformChange = useCallback((next: Transform) => {
    setTransform(next);
  }, []);

  async function handleEscolherFoto(file: File) {
    if (!isFirebaseConfigured()) {
      setUploadError(
        "Configure as variáveis NEXT_PUBLIC_FIREBASE_* em .env.local para enviar fotos.",
      );
      return;
    }

    if (!user) {
      router.push("/login?redirect=/personalizar/" + modelo.id);
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const url = await subirFoto(file);
      setTransform(DEFAULT_TRANSFORM);
      setFotoUrl(url);
    } catch (error) {
      console.error(error);
      setUploadError("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  function abrirRevisao() {
    if (!fotoUrl) return;
    if (!user) {
      router.push("/login?redirect=/personalizar/" + modelo.id);
      return;
    }
    setModalRevisao(true);
  }

  async function confirmarCompra() {
    if (!fotoUrl || !isFirebaseConfigured() || !user) return;

    setComprarError(null);
    setComprando(true);

    const estado: Personalizacao = {
      modeloId: modelo.id,
      fotoUrl,
      transform,
      textos: textos.length ? textos : undefined,
      titulo: titulo.trim() || undefined,
      descricao: descricao.trim() || undefined,
    };

    try {
      const { id, arteProducaoUrl } = await salvarPersonalizacao(estado, user.uid);
      adicionarPersonalizada(
        { ...estado, arteProducaoUrl: arteProducaoUrl ?? undefined },
        id,
      );
      setModalRevisao(false);
      router.push("/carrinho");
    } catch (error) {
      console.error(error);
      setComprarError(
        "Não foi possível salvar a personalização. Tente novamente.",
      );
    } finally {
      setComprando(false);
    }
  }

  function ajustarZoom(delta: number) {
    setTransform((prev) => ({
      ...prev,
      scale: Math.min(4, Math.max(0.2, prev.scale + delta)),
    }));
  }

  function girar() {
    setTransform((prev) => ({
      ...prev,
      rotation: (prev.rotation + 90) % 360,
    }));
  }

  function adicionarTexto() {
    const { molduraX, molduraY, molduraW, molduraH } = getCaseLayout();
    const novo = criarTextoPadrao(molduraX, molduraY, molduraW, molduraH);
    setTextos((prev) => [...prev, novo]);
    setTextoSelecionadoId(novo.id);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-12 pt-6 sm:pt-8">
        <header className="space-y-1">
          <PageBackLink href="/#personalizar" label="← Voltar à loja" />
          <h1 className="mt-3 text-2xl font-semibold text-zinc-900">
            Personalizar capinha
          </h1>
          <p className="text-sm text-zinc-600">
            {modelo.marca} {modelo.modelo}
          </p>
        </header>

        <div className="flex flex-wrap gap-2">
          {MODELOS.map((m) => (
            <Link
              key={m.id}
              href={`/personalizar/${m.id}`}
              className={`rounded-full px-3 py-1 text-sm transition ${
                m.id === modelo.id
                  ? "bg-zinc-900 text-white"
                  : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
              }`}
            >
              {m.modelo}
            </Link>
          ))}
        </div>

        <CaseEditor
          modelo={modelo}
          fotoUrl={fotoUrl}
          transform={transform}
          textos={textos}
          textoSelecionadoId={textoSelecionadoId}
          onTransformChange={handleTransformChange}
          onTextosChange={setTextos}
          onTextoSelecionadoChange={setTextoSelecionadoId}
        />

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void handleEscolherFoto(file);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={uploading}
            onClick={() => fileInputRef.current?.click()}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {uploading
              ? "Enviando..."
              : fotoUrl
                ? "Trocar foto"
                : "Escolher foto"}
          </button>

          <button
            type="button"
            disabled={!fotoUrl}
            onClick={() => ajustarZoom(-0.1)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 disabled:opacity-40"
          >
            Zoom −
          </button>
          <button
            type="button"
            disabled={!fotoUrl}
            onClick={() => ajustarZoom(0.1)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 disabled:opacity-40"
          >
            Zoom +
          </button>
          <button
            type="button"
            disabled={!fotoUrl}
            onClick={girar}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 disabled:opacity-40"
          >
            Girar 90°
          </button>
        </div>

        {fotoUrl && (
          <>
            <TextoCapinhaPanel
              textos={textos}
              textoSelecionadoId={textoSelecionadoId}
              onTextosChange={setTextos}
              onTextoSelecionadoChange={setTextoSelecionadoId}
              onAdicionarTexto={adicionarTexto}
            />
            <PersonalizacaoFields
              titulo={titulo}
              descricao={descricao}
              onTituloChange={setTitulo}
              onDescricaoChange={setDescricao}
            />
          </>
        )}

        {uploadError && <p className="text-sm text-red-600">{uploadError}</p>}
        {comprarError && <p className="text-sm text-red-600">{comprarError}</p>}

        <button
          type="button"
          disabled={!fotoUrl || comprando}
          onClick={abrirRevisao}
          className="w-full rounded-xl bg-emerald-600 py-3 text-base font-semibold text-white disabled:opacity-40"
        >
          Revisar e adicionar ao carrinho
        </button>

        <p className="text-xs text-zinc-500">
          Você verá um preview antes de confirmar. A arte para produção é gerada
          automaticamente para a equipe Zenpro.
        </p>
      </main>

      {fotoUrl && (
        <RevisarPersonalizacaoModal
          aberto={modalRevisao}
          personalizacao={{ fotoUrl, transform, textos, titulo, descricao }}
          modeloRotulo={`${modelo.marca} ${modelo.modelo}`}
          confirmando={comprando}
          tituloBotao="Confirmar e ir ao carrinho"
          onFechar={() => setModalRevisao(false)}
          onConfirmar={() => void confirmarCompra()}
        />
      )}
    </div>
  );
}
