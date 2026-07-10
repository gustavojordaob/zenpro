"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PersonalizacaoFields } from "@/components/personalizacao/PersonalizacaoFields";
import { TextoCapinhaPanel } from "@/components/personalizacao/TextoCapinhaPanel";
import { RevisarPersonalizacaoModal } from "@/components/personalizacao/RevisarPersonalizacaoModal";
import { MontarColagemModal } from "@/components/personalizacao/MontarColagemModal";
import { CriarFotoIAModal } from "@/components/personalizacao/CriarFotoIAModal";
import { PreviewCapaModal } from "@/features/personalizacao/PreviewCapaModal";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { useAuth } from "@/features/auth/AuthProvider";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { useCarrinho } from "@/features/loja/CarrinhoProvider";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { salvarPersonalizacao } from "@/features/loja/salvarPersonalizacao";
import { criarTextoPadrao, type TextoCapinha } from "@/features/personalizacao/caseTextFonts";
import { getCaseLayout } from "@/features/personalizacao/caseGeometry";
import {
  DEFAULT_TRANSFORM,
  type FotoPersonalizacao,
  type Personalizacao,
  type Transform,
} from "@/features/personalizacao/types";
import {
  ART_CANVAS,
  DEFAULT_COR_FUNDO_CAPINHA,
  MAX_FOTOS_PERSONALIZACAO,
  ZOOM_MAX,
  ZOOM_MIN,
} from "@/features/personalizacao/caseVisualConstants";
import type { PersonalizacaoEditorContext } from "@/features/catalogo/personalizacaoContext";
import {
  listarModelosAtivos,
} from "@/features/catalogo/catalogoRuntimeService";
import type { TipoPersonalizacao } from "@/features/catalogo/types";
import { formatarPreco } from "@/features/loja/produtosMock";
import { expandirFotoPara916, fileToDataUrl } from "@/features/personalizacao/expandirFotoPara916";
import {
  calcularTransformsLayout,
  rotuloLayoutPadrao,
} from "@/features/personalizacao/fotoLayoutPresets";
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
        className="flex h-[680px] w-full max-w-[360px] items-center justify-center rounded-2xl p-5"
        style={{ backgroundColor: "#ececec" }}
      >
        <p className="text-sm text-zinc-500">Carregando editor...</p>
      </div>
    ),
  },
);

type Props = {
  contexto: PersonalizacaoEditorContext;
  tipoPersonalizacao: TipoPersonalizacao;
};

type ModeloOpcao = { id: string; rotulo: string };

type FotoSlot = FotoPersonalizacao & {
  localUrl?: string;
  /** Cópia em memória para export/preview sem CORS do Storage. */
  dataUrl?: string;
};

const CORES_FUNDO_PRESET = [
  { rotulo: "Branco", hex: "#ffffff" },
  { rotulo: "Preto", hex: "#171717" },
  { rotulo: "Cinza", hex: "#e4e4e7" },
  { rotulo: "Rosa", hex: "#fecdd3" },
  { rotulo: "Azul", hex: "#bfdbfe" },
  { rotulo: "Bege", hex: "#fef3c7" },
] as const;

function urlParaExport(f: FotoSlot): string {
  return f.dataUrl ?? f.localUrl ?? f.fotoUrl ?? "";
}

function escalaFromSliderPercent(
  percent: number,
  coverScale: number,
): number {
  const min = coverScale * ZOOM_MIN;
  const max = coverScale * ZOOM_MAX;
  const t = Math.min(100, Math.max(0, percent)) / 100;
  return min + t * (max - min);
}

function sliderPercentFromEscala(scale: number, coverScale: number): number {
  const min = coverScale * ZOOM_MIN;
  const max = coverScale * ZOOM_MAX;
  if (max <= min) return 50;
  return Math.round(((scale - min) / (max - min)) * 100);
}

function novaFotoId() {
  return `foto-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function PersonalizarEditor({
  contexto,
  tipoPersonalizacao,
}: Props) {
  const { modelo, produto, modelosDisponiveis } = contexto;
  const router = useRouter();
  const paths = useLojaPaths();
  const { adicionarPersonalizada } = useCarrinho();
  const { user } = useAuth();
  const [fotos, setFotos] = useState<FotoSlot[]>([]);
  const [fotoAtivaId, setFotoAtivaId] = useState<string | null>(null);
  const fotoAtiva = fotos.find((f) => f.id === fotoAtivaId) ?? fotos[0] ?? null;
  const fotoUrl = fotoAtiva?.localUrl ?? fotoAtiva?.fotoUrl ?? null;
  const transform = fotoAtiva?.transform ?? DEFAULT_TRANSFORM;
  const [titulo, setTitulo] = useState("");
  const [descricao, setDescricao] = useState("");
  const [textos, setTextos] = useState<TextoCapinha[]>([]);
  const [textoSelecionadoId, setTextoSelecionadoId] = useState<string | null>(
    null,
  );
  const [uploading, setUploading] = useState(false);
  const [comprando, setComprando] = useState(false);
  const [modalRevisao, setModalRevisao] = useState(false);
  const [modalPreview, setModalPreview] = useState(false);
  const [modalColagem, setModalColagem] = useState(false);
  const [modalIA, setModalIA] = useState(false);
  const [gerandoIA, setGerandoIA] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [comprarError, setComprarError] = useState<string | null>(null);
  const [corFundo, setCorFundo] = useState(DEFAULT_COR_FUNDO_CAPINHA);
  const [modelosOpcoes, setModelosOpcoes] = useState<ModeloOpcao[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fotosRef = useRef(fotos);
  const coverScalePorFoto = useRef<Record<string, number>>({});
  const layoutCountRef = useRef(0);
  fotosRef.current = fotos;

  const aplicarLayoutPadrao = useCallback(async (lista: FotoSlot[]) => {
    if (lista.length === 0) return;
    const { areaUtil } = getCaseLayout();
    const transforms = await calcularTransformsLayout(
      lista.map((f) => ({ id: f.id, url: urlParaExport(f) })),
      areaUtil,
    );
    setFotos((prev) =>
      prev.map((f) =>
        transforms[f.id] ? { ...f, transform: transforms[f.id] } : f,
      ),
    );
    for (const [id, t] of Object.entries(transforms)) {
      coverScalePorFoto.current[id] = t.scale;
    }
  }, []);

  const produtoId = produto?.produtoId;
  const personalizarPath = (modeloId: string) =>
    paths.personalizar(modeloId, produtoId);

  useEffect(() => {
    void listarModelosAtivos().then((lista) => {
      const filtrados = lista.filter((m) => modelosDisponiveis.includes(m.id));
      setModelosOpcoes(
        filtrados.map((m) => ({
          id: m.id,
          rotulo: m.nome,
        })),
      );
    });
  }, [modelosDisponiveis]);

  const handleTransformChange = useCallback((id: string, next: Transform) => {
    setFotos((prev) =>
      prev.map((f) => (f.id === id ? { ...f, transform: next } : f)),
    );
  }, []);

  const handleFotoInicializada = useCallback(
    (id: string, next: Transform) => {
      coverScalePorFoto.current[id] = next.scale;
      handleTransformChange(id, next);
    },
    [handleTransformChange],
  );

  const sliderTamanho = fotoAtiva
    ? sliderPercentFromEscala(
        transform.scale,
        coverScalePorFoto.current[fotoAtiva.id] ?? transform.scale,
      )
    : 50;

  function ajustarSliderTamanho(percent: number) {
    if (!fotoAtiva) return;
    const cover =
      coverScalePorFoto.current[fotoAtiva.id] ?? fotoAtiva.transform.scale;
    handleTransformChange(fotoAtiva.id, {
      ...transform,
      scale: escalaFromSliderPercent(percent, cover),
    });
  }

  const camadasEditor = useMemo(
    () =>
      fotos.map((f) => ({
        id: f.id,
        url: f.dataUrl ?? f.localUrl ?? f.fotoUrl,
        transform: f.transform,
      })),
    [fotos],
  );

  /** Prévia/export: Firebase HTTPS (getBlob) — evita blob revogado. */
  const fotosExport = useMemo(
    () =>
      fotos.map((f) => ({
        url: urlParaExport(f),
        transform: f.transform,
      })),
    [fotos],
  );

  useEffect(() => {
    return () => {
      for (const f of fotosRef.current) {
        if (f.localUrl) URL.revokeObjectURL(f.localUrl);
      }
    };
  }, []);

  useEffect(() => {
    if (fotos.length === 0) {
      layoutCountRef.current = 0;
      return;
    }
    if (layoutCountRef.current === fotos.length) return;
    layoutCountRef.current = fotos.length;
    void aplicarLayoutPadrao(fotosRef.current);
  }, [fotos.length, aplicarLayoutPadrao]);

  async function inserirFotoNoEditor(
    file: File,
    opts: { expandir916?: boolean; substituir?: boolean } = {},
  ) {
    const { expandir916 = true, substituir = false } = opts;

    if (!isFirebaseConfigured()) {
      setUploadError(
        "Configure as variáveis NEXT_PUBLIC_FIREBASE_* em .env.local para enviar fotos.",
      );
      return;
    }

    if (!substituir && fotos.length >= MAX_FOTOS_PERSONALIZACAO) {
      setUploadError(`Máximo de ${MAX_FOTOS_PERSONALIZACAO} fotos por case.`);
      return;
    }

    if (!user) {
      router.push(paths.loginRedirect(personalizarPath(modelo.id)));
      return;
    }

    setUploadError(null);
    setUploading(true);

    try {
      const processada = expandir916 ? await expandirFotoPara916(file) : file;
      const [localUrl, dataUrl] = await Promise.all([
        Promise.resolve(URL.createObjectURL(processada)),
        fileToDataUrl(processada),
      ]);
      const id = novaFotoId();
      try {
        const url = await subirFoto(processada);
        if (substituir) {
          for (const f of fotosRef.current) {
            if (f.localUrl) URL.revokeObjectURL(f.localUrl);
          }
          coverScalePorFoto.current = {};
          layoutCountRef.current = 0;
          setFotos([
            {
              id,
              fotoUrl: url,
              localUrl,
              dataUrl,
              transform: DEFAULT_TRANSFORM,
            },
          ]);
        } else {
          setFotos((prev) => [
            ...prev,
            {
              id,
              fotoUrl: url,
              localUrl,
              dataUrl,
              transform: DEFAULT_TRANSFORM,
            },
          ]);
        }
        setFotoAtivaId(id);
        setModalColagem(false);
        setModalIA(false);
      } catch (uploadErr) {
        URL.revokeObjectURL(localUrl);
        throw uploadErr;
      }
    } catch (error) {
      console.error(error);
      setUploadError("Não foi possível enviar a foto. Tente novamente.");
    } finally {
      setUploading(false);
    }
  }

  async function handleEscolherFoto(file: File) {
    await inserirFotoNoEditor(file, { expandir916: true, substituir: false });
  }

  async function handleColagemConfirmada(file: File) {
    await inserirFotoNoEditor(file, { expandir916: false, substituir: true });
  }

  async function handleIAConfirmada(file: File) {
    await inserirFotoNoEditor(file, { expandir916: true, substituir: true });
  }

  function removerFoto(id: string) {
    setFotos((prev) => {
      const alvo = prev.find((f) => f.id === id);
      if (alvo?.localUrl) URL.revokeObjectURL(alvo.localUrl);
      const rest = prev.filter((f) => f.id !== id);
      setFotoAtivaId((atual) => {
        if (atual !== id) return atual;
        return rest[0]?.id ?? null;
      });
      return rest;
    });
  }

  function abrirRevisao() {
    if (fotos.length === 0) return;
    if (!user) {
      router.push(paths.loginRedirect(personalizarPath(modelo.id)));
      return;
    }
    setModalRevisao(true);
  }

  async function confirmarCompra() {
    if (fotos.length === 0 || !isFirebaseConfigured() || !user) return;

    setComprarError(null);
    setComprando(true);

    const fotoPrincipal = fotoAtiva ?? fotos[0];

    const estado: Personalizacao = {
      modeloId: modelo.id,
      produtoId: produto?.produtoId,
      produtoNome: produto?.nome,
      precoCentavos: produto?.precoCentavos,
      material: produto?.material,
      larguraPx: ART_CANVAS.width,
      alturaPx: ART_CANVAS.height,
      maskUrl: contexto.visual.maskUrl,
      fotos: fotos.map(({ id, fotoUrl: url, transform: t }) => ({
        id,
        fotoUrl: url,
        transform: t,
      })),
      fotoUrl: fotoPrincipal.fotoUrl,
      transform: fotoPrincipal.transform,
      textos: textos.length ? textos : undefined,
      titulo: titulo.trim() || undefined,
      descricao: descricao.trim() || undefined,
      corFundo,
    };

    try {
      const { id, arteProducaoUrl, arteFotoUrl, arteTextoUrl } =
        await salvarPersonalizacao({
          dados: estado,
          userId: user.uid,
          tipoPersonalizacao,
          fotosExport: fotos.map((f) => ({
            url: urlParaExport(f),
            transform: f.transform,
          })),
        });
      adicionarPersonalizada(
        {
          ...estado,
          arteProducaoUrl: arteProducaoUrl ?? undefined,
          arteFotoUrl: arteFotoUrl ?? undefined,
          arteTextoUrl: arteTextoUrl ?? undefined,
        },
        id,
        produto?.produtoId,
      );
      setModalRevisao(false);
      router.push(paths.carrinho);
    } catch (error) {
      console.error(error);
      setComprarError(
        "Não foi possível salvar a personalização. Tente novamente.",
      );
    } finally {
      setComprando(false);
    }
  }

  function ajustarZoom(menos: boolean) {
    if (!fotoAtiva) return;
    ajustarSliderTamanho(sliderTamanho + (menos ? -8 : 8));
  }

  function adicionarTexto() {
    const { areaUtil } = getCaseLayout();
    const novo = criarTextoPadrao(
      areaUtil.x,
      areaUtil.y,
      areaUtil.w,
      areaUtil.h,
    );
    setTextos((prev) => [...prev, novo]);
    setTextoSelecionadoId(novo.id);
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="pb-safe mx-auto flex w-full max-w-lg flex-col gap-6 px-4 pb-16 pt-6 sm:pt-8">
        <header className="space-y-1">
          <PageBackLink href={paths.personalizarHash} label="← Voltar à loja" />
          <h1 className="mt-3 text-2xl font-semibold text-zinc-900">
            {produto?.nome ?? "Personalizar case"}
          </h1>
          <p className="text-sm text-zinc-600">
            {modelo.marca} {modelo.modelo}
            {produto?.material ? ` · ${produto.material}` : ""}
          </p>
          {produto && (
            <p className="text-base font-semibold text-zinc-900">
              {formatarPreco(produto.precoCentavos)}
            </p>
          )}
        </header>

        {modelosOpcoes.length > 1 && (
          <div className="flex flex-wrap gap-2">
            {modelosOpcoes.map((m) => (
              <Link
                key={m.id}
                href={personalizarPath(m.id)}
                className={`rounded-full px-3 py-1 text-sm transition ${
                  m.id === modelo.id
                    ? "bg-zinc-900 text-white"
                    : "bg-zinc-200 text-zinc-700 hover:bg-zinc-300"
                }`}
              >
                {m.rotulo}
              </Link>
            ))}
          </div>
        )}

        <p className="text-xs text-zinc-500">
          Escolha uma foto ou use <strong>Criar com IA</strong> para juntar 2 a
          4 fotos numa cena só (ex.: você e alguém juntos). Depois ajuste na
          capa e adicione texto.
        </p>

        {fotos.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {fotos.map((f, i) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setFotoAtivaId(f.id)}
                className={`relative rounded-lg border px-3 py-1.5 text-xs font-medium transition ${
                  f.id === fotoAtivaId
                    ? "border-zinc-900 bg-zinc-900 text-white"
                    : "border-zinc-300 bg-white text-zinc-700 hover:border-zinc-400"
                }`}
              >
                Foto {i + 1}
                {fotos.length > 1 && (
                  <span
                    role="button"
                    tabIndex={0}
                    className="ml-2 text-zinc-400 hover:text-red-500"
                    onClick={(e) => {
                      e.stopPropagation();
                      removerFoto(f.id);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.stopPropagation();
                        removerFoto(f.id);
                      }
                    }}
                  >
                    ×
                  </span>
                )}
              </button>
            ))}
            {fotos.length >= 2 && (
              <>
                <span className="text-xs text-zinc-500">
                  Layout: {rotuloLayoutPadrao(fotos.length)}
                </span>
                <button
                  type="button"
                  onClick={() => void aplicarLayoutPadrao(fotos)}
                  className="rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:border-zinc-400"
                >
                  Reorganizar fotos
                </button>
              </>
            )}
          </div>
        )}

        <CaseEditor
          modelo={modelo}
          fotos={camadasEditor}
          fotoAtivaId={fotoAtivaId}
          corFundo={corFundo}
          textos={textos}
          textoSelecionadoId={textoSelecionadoId}
          onTransformChange={handleTransformChange}
          onFotoInicializada={handleFotoInicializada}
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
            {uploading ? "Enviando..." : fotos.length > 0 ? "Trocar foto" : "Escolher foto"}
          </button>

          <button
            type="button"
            disabled={uploading || gerandoIA}
            onClick={() => setModalIA(true)}
            className="rounded-lg border border-violet-600 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-900 disabled:opacity-50"
          >
            Criar com IA
          </button>

          <button
            type="button"
            disabled={uploading || gerandoIA}
            onClick={() => setModalColagem(true)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-xs font-medium text-zinc-600 disabled:opacity-50"
          >
            Colagem simples
          </button>

          <button
            type="button"
            disabled={!fotoAtiva}
            onClick={() => ajustarZoom(true)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 disabled:opacity-40"
            aria-label="Diminuir foto"
          >
            −
          </button>
          <button
            type="button"
            disabled={!fotoAtiva}
            onClick={() => ajustarZoom(false)}
            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-800 disabled:opacity-40"
            aria-label="Aumentar foto"
          >
            +
          </button>
          <button
            type="button"
            disabled={fotos.length === 0}
            onClick={() => setModalPreview(true)}
            className="rounded-lg border border-zinc-900 bg-zinc-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-40"
          >
            Ver na case
          </button>
        </div>

        {fotoAtiva && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-sm font-medium text-zinc-900">Tamanho da foto</p>
              <span className="text-xs text-zinc-500">{sliderTamanho}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={sliderTamanho}
              onChange={(e) => ajustarSliderTamanho(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-zinc-900"
              aria-label="Tamanho da foto"
            />
            <p className="mt-2 text-xs text-zinc-500">
              Arraste a barra, use <strong>+</strong>/<strong>−</strong>, pinça
              com dois dedos (celular) ou scroll do mouse sobre a capa (computador).
            </p>
          </div>
        )}

        {fotos.length > 0 && !fotoAtiva && (
          <p className="text-xs text-zinc-500">
            Selecione uma aba de foto para ajustar o tamanho.
          </p>
        )}

        {fotos.length > 0 && (
          <div className="rounded-xl border border-zinc-200 bg-white p-4">
            <p className="text-sm font-medium text-zinc-900">Cor de fundo</p>
            <p className="mt-0.5 text-xs text-zinc-500">
              Aparece nos espaços vazios quando você diminui a foto.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {CORES_FUNDO_PRESET.map((c) => (
                <button
                  key={c.hex}
                  type="button"
                  title={c.rotulo}
                  onClick={() => setCorFundo(c.hex)}
                  className={`h-9 w-9 rounded-full border-2 transition ${
                    corFundo === c.hex
                      ? "border-zinc-900 ring-2 ring-zinc-400"
                      : "border-zinc-300"
                  }`}
                  style={{ backgroundColor: c.hex }}
                />
              ))}
              <label className="flex h-9 cursor-pointer items-center gap-2 rounded-lg border border-zinc-300 px-2 text-xs text-zinc-600">
                Outra
                <input
                  type="color"
                  value={corFundo}
                  onChange={(e) => setCorFundo(e.target.value)}
                  className="h-6 w-8 cursor-pointer border-0 bg-transparent p-0"
                />
              </label>
            </div>
          </div>
        )}

        {fotoAtiva && (
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
          disabled={fotos.length === 0 || comprando}
          onClick={abrirRevisao}
          className="btn-gold w-full rounded-xl py-3 text-base disabled:opacity-40"
        >
          Revisar e adicionar ao carrinho
        </button>

        <p className="text-xs text-zinc-500">
          Você verá um preview antes de confirmar. A arte para produção é gerada
          automaticamente para a equipe Zenpro.
        </p>
      </main>

      <CriarFotoIAModal
        aberto={modalIA}
        substituirExistente={fotos.length > 0}
        gerando={uploading}
        onFechar={() => setModalIA(false)}
        onConfirmar={(file) => void handleIAConfirmada(file)}
        onGerandoChange={setGerandoIA}
      />

      <MontarColagemModal
        aberto={modalColagem}
        substituirExistente={fotos.length > 0}
        corFundoInicial={corFundo}
        gerando={uploading}
        onFechar={() => setModalColagem(false)}
        onConfirmar={(file) => void handleColagemConfirmada(file)}
      />

      {fotos.length > 0 && (
        <PreviewCapaModal
          aberto={modalPreview}
          fotos={fotosExport}
          corFundo={corFundo}
          textos={textos}
          modeloId={modelo.id}
          modeloRotulo={`${modelo.marca} ${modelo.modelo}`}
          onFechar={() => setModalPreview(false)}
        />
      )}

      {fotoUrl && (
        <RevisarPersonalizacaoModal
          aberto={modalRevisao}
          personalizacao={{
            fotoUrl: fotoAtiva?.localUrl ?? fotoUrl ?? "",
            transform,
            textos,
            titulo,
            descricao,
          }}
          modeloRotulo={`${modelo.marca} ${modelo.modelo}`}
          modeloId={modelo.id}
          confirmando={comprando}
          tituloBotao="Confirmar e ir ao carrinho"
          onFechar={() => setModalRevisao(false)}
          onConfirmar={() => void confirmarCompra()}
        />
      )}
    </div>
  );
}
