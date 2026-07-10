"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import { MATERIAIS_CAPINHA } from "@/features/catalogo/materiaisCapinha";
import { SEED_CATALOGO } from "@/features/catalogo/types";
import {
  criarMarcaAdmin,
  listarMarcasAdmin,
  type MarcaCatalogoAdmin,
} from "@/features/admin/catalogo/marcaAdminService";
import { criarModeloAdmin } from "@/features/admin/catalogo/modeloAdminService";
import {
  atualizarProdutoCentral,
  criarProdutoCentral,
} from "@/features/admin/produtos/produtoCentralService";
import { subirImagemProduto } from "@/features/admin/produtos/uploadImagemProduto";
import {
  DISPOSITIVOS_PRESETS,
  getDispositivoPreset,
} from "@/features/admin/catalogo/dispositivosPresets";
import { CAMERA_PRESET_OPCOES } from "@/features/personalizacao/cameraModules";
import { reaisInputParaCentavos } from "@/features/admin/produtos/produtoFormUtils";

export function CapinhaNovaPageClient() {
  const router = useRouter();

  const [marcas, setMarcas] = useState<MarcaCatalogoAdmin[]>([]);
  const [carregandoMarcas, setCarregandoMarcas] = useState(true);

  // Passo 1 — aparelho
  const [presetId, setPresetId] = useState<string>("galaxy-s24");
  const [modeloNome, setModeloNome] = useState("");
  const [marcaMode, setMarcaMode] = useState<"existente" | "nova">("nova");
  const [marcaId, setMarcaId] = useState("");
  const [marcaNovaNome, setMarcaNovaNome] = useState("");
  const [cameraPresetId, setCameraPresetId] = useState<string>("galaxy-s24");
  const [corAparelho, setCorAparelho] = useState("#1a1a1a");
  const [avancado, setAvancado] = useState(false);
  const [larguraPx, setLarguraPx] = useState(1080);
  const [alturaPx, setAlturaPx] = useState(2340);

  // Passo 2 — produto
  const [precoReais, setPrecoReais] = useState("");
  const [material, setMaterial] = useState("");
  const [arquivoImagem, setArquivoImagem] = useState<File | null>(null);
  const [previewImagem, setPreviewImagem] = useState<string | null>(null);
  const [nomeProduto, setNomeProduto] = useState("");
  const [nomeProdutoEditado, setNomeProdutoEditado] = useState(false);

  const [salvando, setSalvando] = useState(false);
  const [etapa, setEtapa] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    void listarMarcasAdmin()
      .then((lista) => {
        setMarcas(lista);
        if (lista.length > 0) {
          setMarcaMode("existente");
          setMarcaId(lista[0].id);
        }
      })
      .finally(() => setCarregandoMarcas(false));
  }, []);

  // Aplica preset de aparelho (dimensões, câmera, cor, marca sugerida).
  function aplicarPreset(id: string) {
    setPresetId(id);
    const p = getDispositivoPreset(id);
    if (!p) return;
    setLarguraPx(p.larguraPx);
    setAlturaPx(p.alturaPx);
    setCameraPresetId(p.cameraPresetId);
    setCorAparelho(p.corAparelho);
    if (p.marcaSugerida) {
      const existente = marcas.find((m) => m.id === p.marcaSugerida);
      if (existente) {
        setMarcaMode("existente");
        setMarcaId(existente.id);
      } else {
        setMarcaMode("nova");
        setMarcaNovaNome(rotuloMarcaSugerida(p.marcaSugerida));
      }
    }
  }

  const materialRotulo = useMemo(
    () => MATERIAIS_CAPINHA.find((m) => m.id === material)?.rotulo ?? "",
    [material],
  );

  const cameraRotulo = useMemo(
    () =>
      CAMERA_PRESET_OPCOES.find((o) => o.id === cameraPresetId)?.rotulo ??
      cameraPresetId,
    [cameraPresetId],
  );

  // Sugestão automática do nome do produto.
  const nomeProdutoSugerido = useMemo(() => {
    const base = modeloNome.trim() ? `Case ${modeloNome.trim()}` : "";
    return materialRotulo && base ? `${base} — ${materialRotulo}` : base;
  }, [modeloNome, materialRotulo]);

  const nomeProdutoFinal = nomeProdutoEditado ? nomeProduto : nomeProdutoSugerido;

  function selecionarImagem(file: File | null) {
    setArquivoImagem(file);
    setPreviewImagem((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  async function publicar() {
    setErro(null);

    if (!modeloNome.trim()) {
      setErro("Informe o nome do aparelho (ex.: Samsung Galaxy S23).");
      return;
    }
    const centavos = reaisInputParaCentavos(precoReais);
    if (centavos === null) {
      setErro("Informe um preço válido (ex.: 79,90).");
      return;
    }
    if (marcaMode === "existente" && !marcaId) {
      setErro("Escolha a marca ou cadastre uma nova.");
      return;
    }
    if (marcaMode === "nova" && !marcaNovaNome.trim()) {
      setErro("Informe o nome da marca nova.");
      return;
    }
    if (!nomeProdutoFinal.trim()) {
      setErro("Informe o nome do produto.");
      return;
    }

    setSalvando(true);
    try {
      // 1) Marca (cria se for nova)
      setEtapa("Preparando marca...");
      const marcaFinalId =
        marcaMode === "nova"
          ? await criarMarcaAdmin({ nome: marcaNovaNome.trim(), ativo: true })
          : marcaId;

      // 2) Modelo do aparelho (sem exigir PNGs — usa forma/câmera padrão)
      setEtapa("Cadastrando o aparelho...");
      const modeloId = await criarModeloAdmin({
        marcaId: marcaFinalId,
        nome: modeloNome.trim(),
        maskUrl: "",
        overlayUrl: "",
        larguraPx,
        alturaPx,
        ativo: true,
        corAparelho,
        cameraPresetId,
      });

      // 3) Produto personalizável vinculado ao modelo
      setEtapa("Publicando a case...");
      const produtoPayload = {
        nome: nomeProdutoFinal.trim(),
        descricao: "",
        precoBaseCentavos: centavos,
        imagens: [] as string[],
        ativo: true,
        tipoId: SEED_CATALOGO.TIPO_CAPINHA,
        modoVenda: "personalizada" as const,
        personalizavel: true,
        material: material || null,
        controlaEstoque: false,
        estoqueCentral: 0,
        marcaId: marcaFinalId,
        modelosCompativeis: [modeloId],
      };
      const produtoId = await criarProdutoCentral(produtoPayload);

      // 4) Imagem do produto (opcional)
      if (arquivoImagem) {
        setEtapa("Enviando a imagem...");
        const url = await subirImagemProduto(produtoId, arquivoImagem);
        await atualizarProdutoCentral(produtoId, {
          ...produtoPayload,
          imagens: [url],
        });
      }

      router.push("/admin/produtos");
    } catch (e) {
      setErro(
        e instanceof Error ? e.message : "Não foi possível publicar a case.",
      );
    } finally {
      setSalvando(false);
      setEtapa(null);
    }
  }

  const cor = corAparelho;

  return (
    <AdminShell
      titulo="Nova case personalizável"
      subtitulo="Publique um aparelho novo para o cliente personalizar com a foto — em um passo só"
    >
      <div className="mx-auto max-w-xl space-y-5">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          Escolha o aparelho, o preço e (opcional) a foto do produto. O sistema
          cria o modelo e o produto já prontos para o cliente personalizar — sem
          precisar enviar máscara ou moldura.
        </div>

        {/* Passo 1 — aparelho */}
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            1. Qual é o aparelho?
          </h2>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Modelo base (define tamanho e câmera)
            </span>
            <select
              value={presetId}
              onChange={(e) => aplicarPreset(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
            >
              {agrupar(DISPOSITIVOS_PRESETS).map(([grupo, itens]) => (
                <optgroup key={grupo} label={grupo}>
                  {itens.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.rotulo}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Nome do aparelho (aparece para o cliente)
            </span>
            <input
              type="text"
              value={modeloNome}
              onChange={(e) => setModeloNome(e.target.value)}
              placeholder="Ex.: Samsung Galaxy S23"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </label>

          {/* Marca */}
          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-700">Marca</span>
            {carregandoMarcas ? (
              <p className="text-sm text-zinc-500">Carregando marcas...</p>
            ) : (
              <div className="flex flex-col gap-2">
                {marcas.length > 0 && (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="radio"
                      checked={marcaMode === "existente"}
                      onChange={() => setMarcaMode("existente")}
                    />
                    <select
                      value={marcaId}
                      disabled={marcaMode !== "existente"}
                      onChange={(e) => setMarcaId(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
                    >
                      {marcas.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.nome}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    checked={marcaMode === "nova"}
                    onChange={() => setMarcaMode("nova")}
                  />
                  <input
                    type="text"
                    value={marcaNovaNome}
                    disabled={marcaMode !== "nova"}
                    onChange={(e) => setMarcaNovaNome(e.target.value)}
                    placeholder="Nova marca (ex.: Samsung)"
                    className="flex-1 rounded-lg border border-zinc-300 px-3 py-2 text-sm disabled:bg-zinc-100"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Câmera (automática do modelo) + cor */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">
                Câmera do mock
              </span>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2.5 text-sm text-zinc-700">
                {cameraRotulo}
                <span className="ml-1 text-xs text-zinc-400">
                  (definida pelo modelo base)
                </span>
              </div>
            </div>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">
                Cor do aparelho
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={cor}
                  onChange={(e) => setCorAparelho(e.target.value)}
                  className="h-10 w-14 rounded border border-zinc-300"
                />
                <span className="text-xs text-zinc-500">{cor}</span>
              </div>
            </label>
          </div>

          <button
            type="button"
            onClick={() => setAvancado((v) => !v)}
            className="text-xs font-medium text-violet-700 underline"
          >
            {avancado
              ? "Ocultar ajustes avançados"
              : "Ajustar câmera e dimensões (avançado)"}
          </button>
          {avancado && (
            <div className="space-y-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium text-zinc-700">
                  Trocar câmera do mock (opcional)
                </span>
                <select
                  value={cameraPresetId}
                  onChange={(e) => setCameraPresetId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
                >
                  {agrupar(CAMERA_PRESET_OPCOES).map(([grupo, itens]) => (
                    <optgroup key={grupo} label={grupo}>
                      {itens.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.rotulo}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block space-y-1.5">
                  <span className="text-xs text-zinc-600">Largura (px)</span>
                  <input
                    type="number"
                    min={1}
                    value={larguraPx}
                    onChange={(e) => setLarguraPx(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="text-xs text-zinc-600">Altura (px)</span>
                  <input
                    type="number"
                    min={1}
                    value={alturaPx}
                    onChange={(e) => setAlturaPx(Number(e.target.value) || 0)}
                    className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
                  />
                </label>
              </div>
            </div>
          )}
        </section>

        {/* Passo 2 — produto */}
        <section className="space-y-4 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-base font-semibold text-zinc-900">
            2. O que o cliente compra
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">Preço (R$)</span>
              <input
                type="text"
                inputMode="decimal"
                value={precoReais}
                onChange={(e) => setPrecoReais(e.target.value)}
                placeholder="79,90"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">
                Material / acabamento
              </span>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm"
              >
                <option value="">— Não informado —</option>
                {MATERIAIS_CAPINHA.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.rotulo}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Nome do produto na loja
            </span>
            <input
              type="text"
              value={nomeProdutoFinal}
              onChange={(e) => {
                setNomeProdutoEditado(true);
                setNomeProduto(e.target.value);
              }}
              placeholder="Case Samsung Galaxy S23 — Silicone"
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-zinc-900"
            />
          </label>

          <div className="space-y-2">
            <span className="text-sm font-medium text-zinc-700">
              Foto do produto (opcional)
            </span>
            <div className="flex items-center gap-3">
              {previewImagem && (
                <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-200">
                  <Image
                    src={previewImagem}
                    alt=""
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
              )}
              <label className="flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-3 text-sm text-zinc-600 hover:bg-zinc-100">
                <input
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={(e) => selecionarImagem(e.target.files?.[0] ?? null)}
                />
                {previewImagem ? "Trocar imagem" : "Escolher imagem"}
              </label>
            </div>
          </div>
        </section>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={salvando}
            onClick={() => void publicar()}
            className="btn-gold rounded-xl px-6 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {salvando ? etapa ?? "Publicando..." : "Publicar case personalizável"}
          </button>
          <Link
            href="/admin/produtos"
            className="rounded-xl border border-zinc-300 px-5 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}

function agrupar<T extends { grupo: string }>(itens: T[]): [string, T[]][] {
  const ordem: string[] = [];
  const mapa = new Map<string, T[]>();
  for (const it of itens) {
    if (!mapa.has(it.grupo)) {
      mapa.set(it.grupo, []);
      ordem.push(it.grupo);
    }
    mapa.get(it.grupo)!.push(it);
  }
  return ordem.map((g) => [g, mapa.get(g)!] as [string, T[]]);
}

function rotuloMarcaSugerida(id: string): string {
  const mapa: Record<string, string> = {
    apple: "Apple",
    samsung: "Samsung",
    google: "Google",
    motorola: "Motorola",
    xiaomi: "Xiaomi",
  };
  return mapa[id] ?? "";
}
