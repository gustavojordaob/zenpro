"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { listarMarcasAdmin } from "@/features/admin/catalogo/marcaAdminService";
import {
  atualizarModeloAdmin,
  criarModeloAdmin,
  obterModeloAdmin,
} from "@/features/admin/catalogo/modeloAdminService";
import { subirAssetModelo } from "@/features/admin/catalogo/uploadAssetModelo";
import { CAMERA_PRESET_OPCOES } from "@/features/personalizacao/cameraModules";
import { IPHONE_ASSETS } from "@/features/personalizacao/moldura";

type Props = { modeloId?: string };

function AssetUploadBlock({
  titulo,
  descricao,
  url,
  enviando,
  onUpload,
}: {
  titulo: string;
  descricao: string;
  url: string;
  enviando: boolean;
  onUpload: (file: File) => void;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-semibold text-zinc-900">{titulo}</p>
      <p className="mt-1 text-xs text-zinc-600">{descricao}</p>
      {url ? (
        <div className="mt-3 flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt=""
            className="h-20 w-20 rounded-lg border border-zinc-200 bg-white object-contain"
          />
          <span className="text-xs text-emerald-700">Imagem enviada ✓</span>
        </div>
      ) : (
        <p className="mt-2 text-xs text-amber-700">Nenhuma imagem enviada ainda</p>
      )}
      <label className="mt-3 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-zinc-300 bg-white px-4 py-6 text-center hover:border-zinc-400">
        <span className="text-sm font-medium text-zinc-700">
          {enviando ? "Enviando..." : "Clique para escolher imagem (PNG)"}
        </span>
        <span className="mt-1 text-xs text-zinc-500">Não precisa colar URL</span>
        <input
          type="file"
          accept="image/png,image/webp,image/jpeg"
          disabled={enviando}
          className="sr-only"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) onUpload(file);
          }}
        />
      </label>
    </div>
  );
}

export function ModeloFormPageClient({ modeloId }: Props) {
  const router = useRouter();
  const [marcaId, setMarcaId] = useState("");
  const [nome, setNome] = useState("");
  const [maskUrl, setMaskUrl] = useState("");
  const [overlayUrl, setOverlayUrl] = useState("");
  const [larguraPx, setLarguraPx] = useState(1568);
  const [alturaPx, setAlturaPx] = useState(3207);
  const [corAparelho, setCorAparelho] = useState("#1a1a1a");
  const [cameraPresetId, setCameraPresetId] = useState<string>(
    CAMERA_PRESET_OPCOES[0].id,
  );
  const [ativo, setAtivo] = useState(true);
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [idRascunho, setIdRascunho] = useState(modeloId ?? null);
  const [salvando, setSalvando] = useState(false);
  const [uploadMask, setUploadMask] = useState(false);
  const [uploadOverlay, setUploadOverlay] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void listarMarcasAdmin().then((lista) => setMarcas(lista));
  }, []);

  useEffect(() => {
    if (!modeloId) return;
    void obterModeloAdmin(modeloId).then((m) => {
      if (!m) return setErro("Modelo não encontrado.");
      setMarcaId(m.marcaId);
      setNome(m.nome);
      setMaskUrl(m.maskUrl);
      setOverlayUrl(m.overlayUrl);
      setLarguraPx(m.larguraPx);
      setAlturaPx(m.alturaPx);
      setCorAparelho(m.personalizacao?.corAparelho ?? "#1a1a1a");
      setCameraPresetId(
        m.personalizacao?.cameraPresetId ?? CAMERA_PRESET_OPCOES[0].id,
      );
      setAtivo(m.ativo);
      setIdRascunho(m.id);
    });
  }, [modeloId]);

  async function ensureId(): Promise<string> {
    if (idRascunho) return idRascunho;
    const id = await criarModeloAdmin({
      marcaId: marcaId || marcas[0]?.id || "apple",
      nome: nome || "Novo modelo",
      maskUrl: IPHONE_ASSETS.maskUrl,
      overlayUrl: IPHONE_ASSETS.overlayUrl,
      larguraPx,
      alturaPx,
      ativo,
      corAparelho: corAparelho.trim() || null,
      cameraPresetId,
    });
    setIdRascunho(id);
    return id;
  }

  async function handleUpload(tipo: "mask" | "overlay", file: File) {
    if (tipo === "mask") setUploadMask(true);
    else setUploadOverlay(true);
    setErro(null);
    try {
      const id = await ensureId();
      const url = await subirAssetModelo(id, file, tipo);
      if (tipo === "mask") setMaskUrl(url);
      else setOverlayUrl(url);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro no upload.");
    } finally {
      if (tipo === "mask") setUploadMask(false);
      else setUploadOverlay(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!maskUrl || !overlayUrl) {
      setErro("Envie as duas imagens: área da foto e moldura da case.");
      return;
    }
    setSalvando(true);
    setErro(null);
    try {
      const input = {
        marcaId,
        nome,
        maskUrl,
        overlayUrl,
        larguraPx,
        alturaPx,
        ativo,
        corAparelho: corAparelho.trim() || null,
        cameraPresetId,
      };
      if (modeloId || idRascunho) {
        await atualizarModeloAdmin(modeloId ?? idRascunho!, input);
      } else {
        await criarModeloAdmin(input);
      }
      router.push("/admin/modelos");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <AdminShell titulo={modeloId ? "Editar modelo" : "Novo modelo"}>
      <form onSubmit={(e) => void handleSubmit(e)} className="max-w-xl space-y-4 rounded-2xl border bg-white p-6">
        <p className="text-sm text-zinc-600">
          Basta enviar as imagens — não é necessário colar links técnicos.
        </p>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Marca do aparelho</span>
          <select value={marcaId} onChange={(e) => setMarcaId(e.target.value)} required className="w-full rounded-lg border px-3 py-2">
            <option value="">—</option>
            {marcas.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </label>

        <label className="block space-y-1">
          <span className="text-sm font-medium">Nome do modelo</span>
          <input value={nome} onChange={(e) => setNome(e.target.value)} required placeholder="Ex.: iPhone 15" className="w-full rounded-lg border px-3 py-2" />
        </label>

        <AssetUploadBlock
          titulo="1. Área da foto do cliente"
          descricao="PNG com fundo transparente — branco onde a foto aparece, preto onde fica oculta."
          url={maskUrl}
          enviando={uploadMask}
          onUpload={(file) => void handleUpload("mask", file)}
        />

        <AssetUploadBlock
          titulo="2. Moldura da case"
          descricao="PNG com bordas, câmera e detalhes por cima da personalização."
          url={overlayUrl}
          enviando={uploadOverlay}
          onUpload={(file) => void handleUpload("overlay", file)}
        />

        <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
          <legend className="px-1 text-sm font-medium text-zinc-700">
            Mockup do aparelho (editor 2D)
          </legend>
          <p className="text-xs text-zinc-500">
            Define como o módulo de câmera aparece no editor e no preview
            &ldquo;Ver capa&rdquo; deste modelo.
          </p>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Layout da câmera</span>
            <select
              value={cameraPresetId}
              onChange={(e) => setCameraPresetId(e.target.value)}
              className="w-full rounded-lg border px-3 py-2"
            >
              {Array.from(
                CAMERA_PRESET_OPCOES.reduce((mapa, opt) => {
                  const lista = mapa.get(opt.grupo) ?? [];
                  lista.push(opt);
                  mapa.set(opt.grupo, lista);
                  return mapa;
                }, new Map<string, typeof CAMERA_PRESET_OPCOES>()),
              ).map(([grupo, itens]) => (
                <optgroup key={grupo} label={grupo}>
                  {itens.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.rotulo}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Cor do aparelho</span>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={corAparelho}
                onChange={(e) => setCorAparelho(e.target.value)}
                className="h-10 w-14 cursor-pointer rounded border border-zinc-300"
              />
              <input
                type="text"
                value={corAparelho}
                onChange={(e) => setCorAparelho(e.target.value)}
                placeholder="#1a1a1a"
                className="flex-1 rounded-lg border px-3 py-2 font-mono text-sm"
              />
            </div>
          </label>
        </fieldset>

        <details className="text-xs text-zinc-500">
          <summary className="cursor-pointer font-medium text-zinc-600">Opções avançadas (tamanho em pixels)</summary>
          <div className="mt-3 grid grid-cols-2 gap-4">
            <label className="block space-y-1">
              <span>Largura px</span>
              <input type="number" value={larguraPx} onChange={(e) => setLarguraPx(Number(e.target.value))} className="w-full rounded-lg border px-3 py-2" />
            </label>
            <label className="block space-y-1">
              <span>Altura px</span>
              <input type="number" value={alturaPx} onChange={(e) => setAlturaPx(Number(e.target.value))} className="w-full rounded-lg border px-3 py-2" />
            </label>
          </div>
        </details>

        <label className="flex gap-2 text-sm">
          <input type="checkbox" checked={ativo} onChange={(e) => setAtivo(e.target.checked)} /> Ativo
        </label>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <button type="submit" disabled={salvando} className="rounded-xl bg-zinc-900 px-4 py-2 text-sm text-white">
          {salvando ? "Salvando..." : "Salvar modelo"}
        </button>
        <Link href="/admin/modelos" className="ml-3 text-sm underline">Voltar</Link>
      </form>
    </AdminShell>
  );
}
