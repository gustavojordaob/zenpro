"use client";

import { useCallback, useEffect, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  homeMidiaVazia,
  obterHomeMidia,
  salvarHomeMidia,
  slotTemMidia,
  uploadHomeMidiaArquivo,
  type HomeMidiaConfig,
  type HomeSlotMidia,
} from "@/features/loja/homeMidiaService";

type SlotKey = "hero" | "parceiros";

function SlotEditor({
  titulo,
  dica,
  slot,
  slotKey,
  onChange,
  busy,
  setBusy,
  setErro,
}: {
  titulo: string;
  dica: string;
  slot: HomeSlotMidia;
  slotKey: SlotKey;
  onChange: (next: HomeSlotMidia) => void;
  busy: boolean;
  setBusy: (v: boolean) => void;
  setErro: (v: string | null) => void;
}) {
  async function onFile(file: File | null) {
    if (!file) return;
    setBusy(true);
    setErro(null);
    try {
      const { tipo, url } = await uploadHomeMidiaArquivo(slotKey, file);
      if (tipo === "video") {
        onChange({
          ...slot,
          ativo: true,
          tipo: "video",
          mp4Url: url,
        });
      } else {
        onChange({
          ...slot,
          ativo: true,
          tipo: slot.mp4Url ? "video" : "imagem",
          imageUrl: url,
          ...(slot.mp4Url ? {} : { mp4Url: null }),
        });
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha no upload.");
    } finally {
      setBusy(false);
    }
  }

  function limpar() {
    onChange({
      ...slot,
      ativo: false,
      tipo: null,
      mp4Url: null,
      imageUrl: null,
    });
  }

  const tem = slotTemMidia({ ...slot, ativo: true });

  return (
    <section className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-zinc-900">{titulo}</h2>
          <p className="mt-1 text-sm text-zinc-600">{dica}</p>
        </div>
        <label className="inline-flex items-center gap-2 text-sm text-zinc-700">
          <input
            type="checkbox"
            checked={slot.ativo}
            disabled={busy}
            onChange={(e) => onChange({ ...slot, ativo: e.target.checked })}
            className="rounded border-zinc-300"
          />
          Exibir no site
        </label>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Título (opcional)</span>
          <input
            value={slot.titulo}
            disabled={busy}
            onChange={(e) => onChange({ ...slot, titulo: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
            placeholder="Ex.: Lançamento Zen Pro"
          />
        </label>
        <label className="block text-sm">
          <span className="font-medium text-zinc-700">Subtítulo (opcional)</span>
          <input
            value={slot.subtitulo}
            disabled={busy}
            onChange={(e) => onChange({ ...slot, subtitulo: e.target.value })}
            className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
            placeholder="Texto curto"
          />
        </label>
        {slotKey === "hero" ? (
          <>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">CTA — texto</span>
              <input
                value={slot.ctaLabel}
                disabled={busy}
                onChange={(e) =>
                  onChange({ ...slot, ctaLabel: e.target.value })
                }
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
                placeholder="Personalizar agora"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-zinc-700">CTA — link</span>
              <input
                value={slot.ctaHref}
                disabled={busy}
                onChange={(e) => onChange({ ...slot, ctaHref: e.target.value })}
                className="mt-1 w-full rounded-xl border border-zinc-200 px-3 py-2"
                placeholder="#personalizar ou /c/capinhas"
              />
            </label>
          </>
        ) : null}
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="inline-flex cursor-pointer items-center justify-center rounded-xl border border-zinc-300 bg-zinc-50 px-4 py-2.5 text-sm font-medium text-zinc-800 hover:bg-zinc-100">
          {busy ? "Enviando…" : "Enviar vídeo ou foto"}
          <input
            type="file"
            accept="video/mp4,image/jpeg,image/png,image/webp,.mp4"
            className="hidden"
            disabled={busy}
            onChange={(e) => {
              const f = e.target.files?.[0] ?? null;
              e.target.value = "";
              void onFile(f);
            }}
          />
        </label>
        {tem ? (
          <button
            type="button"
            disabled={busy}
            onClick={limpar}
            className="rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Remover mídia
          </button>
        ) : null}
      </div>

      <p className="mt-2 text-xs text-zinc-500">
        Vídeo: MP4 até ~80 MB (ideal 16:9, 1920×1080). Foto: JPG/PNG/WebP até
        5 MB. No vídeo, envie também uma foto se quiser capa (poster).
      </p>

      {tem ? (
        <div className="mt-4 overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-200">
          {slot.mp4Url ? (
            <video
              src={slot.mp4Url}
              poster={slot.imageUrl ?? undefined}
              controls
              muted
              playsInline
              className="max-h-64 w-full object-contain"
            />
          ) : slot.imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={slot.imageUrl}
              alt=""
              className="max-h-64 w-full object-contain"
            />
          ) : null}
        </div>
      ) : (
        <p className="mt-4 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-8 text-center text-sm text-zinc-500">
          Nenhuma mídia ainda neste espaço.
        </p>
      )}
    </section>
  );
}

export function HomeMidiaAdminPageClient() {
  const [config, setConfig] = useState<HomeMidiaConfig>(homeMidiaVazia);
  const [carregando, setCarregando] = useState(true);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      setConfig(await obterHomeMidia());
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function salvar() {
    setBusy(true);
    setErro(null);
    setOk(null);
    try {
      await salvarHomeMidia(config);
      setOk("Salvo. A home atualiza em até alguns minutos (ou no próximo F5).");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Erro ao salvar.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AdminShell
      titulo="Mídia da home"
      subtitulo="Vídeo/foto do banner inicial e da seção de parceiros"
    >
      {erro ? (
        <p className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      ) : null}
      {ok ? (
        <p className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          {ok}
        </p>
      ) : null}

      {carregando ? (
        <p className="text-sm text-zinc-500">Carregando…</p>
      ) : (
        <div className="flex flex-col gap-6">
          <SlotEditor
            titulo="Banner do início (topo)"
            dica="Aparece no começo da home — ideal vídeo 16:9 ou foto larga."
            slot={config.hero}
            slotKey="hero"
            busy={busy}
            setBusy={setBusy}
            setErro={setErro}
            onChange={(hero) => setConfig((c) => ({ ...c, hero }))}
          />
          <SlotEditor
            titulo="Parceiros (final da home)"
            dica="Espaço mais compacto no rodapé da vitrine — vídeo ou foto dos parceiros."
            slot={config.parceiros}
            slotKey="parceiros"
            busy={busy}
            setBusy={setBusy}
            setErro={setErro}
            onChange={(parceiros) => setConfig((c) => ({ ...c, parceiros }))}
          />

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={() => void salvar()}
              className="btn-gold rounded-xl px-5 py-2.5 text-sm font-semibold disabled:opacity-60"
            >
              {busy ? "Salvando…" : "Salvar"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void carregar()}
              className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Recarregar
            </button>
          </div>
        </div>
      )}
    </AdminShell>
  );
}
