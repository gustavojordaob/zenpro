import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type DocumentData,
} from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import type { HomeCarouselSlide } from "@/features/loja/homeContent";
import { getFirebaseDb, getFirebaseStorage, isFirebaseConfigured } from "@/lib/firebase";
import {
  cachedFetch,
  invalidateTtlCache,
  TTL_CATALOGO_MS,
} from "@/lib/ttlCache";

export const SITE_CONTEUDO_COLECAO = "site_conteudo";
export const SITE_HOME_DOC_ID = "home";

export type HomeSlotMidia = {
  ativo: boolean;
  tipo: "video" | "imagem" | null;
  mp4Url: string | null;
  imageUrl: string | null;
  titulo: string;
  subtitulo: string;
  ctaLabel: string;
  ctaHref: string;
};

export type HomeMidiaConfig = {
  hero: HomeSlotMidia;
  parceiros: HomeSlotMidia;
};

const SLOT_VAZIO: HomeSlotMidia = {
  ativo: false,
  tipo: null,
  mp4Url: null,
  imageUrl: null,
  titulo: "",
  subtitulo: "",
  ctaLabel: "",
  ctaHref: "",
};

export function homeMidiaVazia(): HomeMidiaConfig {
  return {
    hero: { ...SLOT_VAZIO },
    parceiros: { ...SLOT_VAZIO },
  };
}

function mapSlot(raw: unknown): HomeSlotMidia {
  if (!raw || typeof raw !== "object") return { ...SLOT_VAZIO };
  const d = raw as DocumentData;
  const tipoRaw = d.tipo;
  const tipo =
    tipoRaw === "video" || tipoRaw === "imagem" ? tipoRaw : null;
  return {
    ativo: Boolean(d.ativo),
    tipo,
    mp4Url: typeof d.mp4Url === "string" && d.mp4Url.trim() ? d.mp4Url.trim() : null,
    imageUrl:
      typeof d.imageUrl === "string" && d.imageUrl.trim()
        ? d.imageUrl.trim()
        : null,
    titulo: String(d.titulo ?? ""),
    subtitulo: String(d.subtitulo ?? ""),
    ctaLabel: String(d.ctaLabel ?? ""),
    ctaHref: String(d.ctaHref ?? ""),
  };
}

function mapConfig(data: DocumentData | undefined): HomeMidiaConfig {
  if (!data) return homeMidiaVazia();
  return {
    hero: mapSlot(data.hero),
    parceiros: mapSlot(data.parceiros),
  };
}

export function slotTemMidia(slot: HomeSlotMidia): boolean {
  if (!slot.ativo) return false;
  if (slot.tipo === "video" && slot.mp4Url) return true;
  if (slot.tipo === "imagem" && slot.imageUrl) return true;
  // fallback: tem url mesmo sem tipo
  return Boolean(slot.mp4Url || slot.imageUrl);
}

/** Slide para o carrossel da loja. */
export function slotParaSlide(
  id: string,
  slot: HomeSlotMidia,
  layout: HomeCarouselSlide["layout"] = "overlay",
): HomeCarouselSlide | null {
  if (!slotTemMidia(slot)) return null;
  const tipo: "video" | "imagem" =
    slot.tipo === "video" || slot.mp4Url ? "video" : "imagem";
  return {
    id,
    tipo,
    mp4Url: slot.mp4Url ?? undefined,
    imageUrl: slot.imageUrl ?? undefined,
    titulo: slot.titulo.trim() || (tipo === "video" ? "Zen Pro" : "Zen Pro"),
    subtitulo: slot.subtitulo.trim() || undefined,
    ctaLabel: slot.ctaLabel.trim() || undefined,
    ctaHref: slot.ctaHref.trim() || undefined,
    layout,
  };
}

export async function obterHomeMidia(): Promise<HomeMidiaConfig> {
  if (!isFirebaseConfigured()) return homeMidiaVazia();
  return cachedFetch(
    "site:home:midia",
    async () => {
      const snap = await getDoc(
        doc(getFirebaseDb(), SITE_CONTEUDO_COLECAO, SITE_HOME_DOC_ID),
      );
      return mapConfig(snap.exists() ? snap.data() : undefined);
    },
    { ttlMs: TTL_CATALOGO_MS },
  );
}

export async function salvarHomeMidia(
  config: HomeMidiaConfig,
): Promise<void> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }
  await setDoc(
    doc(getFirebaseDb(), SITE_CONTEUDO_COLECAO, SITE_HOME_DOC_ID),
    {
      hero: {
        ativo: Boolean(config.hero.ativo),
        tipo: config.hero.tipo,
        mp4Url: config.hero.mp4Url,
        imageUrl: config.hero.imageUrl,
        titulo: config.hero.titulo.trim(),
        subtitulo: config.hero.subtitulo.trim(),
        ctaLabel: config.hero.ctaLabel.trim(),
        ctaHref: config.hero.ctaHref.trim(),
      },
      parceiros: {
        ativo: Boolean(config.parceiros.ativo),
        tipo: config.parceiros.tipo,
        mp4Url: config.parceiros.mp4Url,
        imageUrl: config.parceiros.imageUrl,
        titulo: config.parceiros.titulo.trim(),
        subtitulo: config.parceiros.subtitulo.trim(),
        ctaLabel: config.parceiros.ctaLabel.trim(),
        ctaHref: config.parceiros.ctaHref.trim(),
      },
      atualizadoEm: serverTimestamp(),
    },
    { merge: true },
  );
  invalidateTtlCache("site:home:");
}

const MAX_VIDEO_BYTES = 80 * 1024 * 1024; // 80 MB
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

export async function uploadHomeMidiaArquivo(
  slot: "hero" | "parceiros",
  file: File,
): Promise<{ tipo: "video" | "imagem"; url: string }> {
  const isVideo =
    file.type === "video/mp4" ||
    file.name.toLowerCase().endsWith(".mp4");
  const isImage = file.type.startsWith("image/");

  if (!isVideo && !isImage) {
    throw new Error("Envie um MP4 ou uma imagem (JPG/PNG/WebP).");
  }
  if (isVideo && file.size > MAX_VIDEO_BYTES) {
    throw new Error("Vídeo muito grande (máx. 80 MB). Comprima o MP4.");
  }
  if (isImage && file.size > MAX_IMAGE_BYTES) {
    throw new Error("Imagem muito grande (máx. 5 MB).");
  }

  const storage = getFirebaseStorage();
  const ext = isVideo
    ? "mp4"
    : file.type.includes("png")
      ? "png"
      : file.type.includes("webp")
        ? "webp"
        : "jpg";
  const path = `home/${slot}/${crypto.randomUUID()}.${ext}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file, {
    contentType: isVideo
      ? "video/mp4"
      : file.type || "image/jpeg",
  });
  const url = await getDownloadURL(storageRef);
  return { tipo: isVideo ? "video" : "imagem", url };
}
