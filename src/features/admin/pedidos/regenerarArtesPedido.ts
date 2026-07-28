import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { exportH5PrintArtBlob } from "@/features/personalizacao/exportCaseArt";
import { subirArteProducao } from "@/features/personalizacao/uploadArteProducao";
import {
  resolveRockBodyMaskUrl,
  resolveRockBodyRimUrl,
  resolveRockCameraFrameUrl,
  resolveRockMolduraAspect,
  resolveRockPrintGuideUrl,
} from "@/features/personalizacao/rockCameraAssets";
import { COLECOES } from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { Transform } from "@/features/personalizacao/types";
import type { TextoCapinha } from "@/features/personalizacao/caseTextFonts";
import type { ArtGeo } from "@/features/personalizacao/exportCaseArt";

export function geoH5PrintDoModelo(
  modeloId: string,
  config?: Record<string, unknown> | null,
): ArtGeo {
  const cfg = config ?? {};
  return {
    larguraPx: typeof cfg.larguraPx === "number" ? cfg.larguraPx : undefined,
    alturaPx: typeof cfg.alturaPx === "number" ? cfg.alturaPx : undefined,
    maskUrl:
      resolveRockBodyMaskUrl(modeloId) ||
      (typeof cfg.maskUrl === "string" ? cfg.maskUrl : undefined),
    bodyRimUrl: resolveRockBodyRimUrl(modeloId),
    printGuideUrl: resolveRockPrintGuideUrl(modeloId),
    cameraFrameUrl: resolveRockCameraFrameUrl(modeloId),
    molduraAspect: resolveRockMolduraAspect(modeloId),
    corFundo: typeof cfg.corFundo === "string" ? cfg.corFundo : undefined,
  };
}

/**
 * Gera guia de impressão H5 (laranja + contorno + foto/texto) para o dono.
 * Só atualiza arteProducaoUrl — não gera mais “só foto” / “só texto”.
 */
export async function regenerarArtesItemPedidoAdmin(
  lojaId: string,
  pedidoId: string,
  itemIndex: number,
  userIdDonoArte: string,
): Promise<{
  arteProducaoUrl: string;
}> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }
  const db = getFirebaseDb();
  const ref = doc(db, COLECOES.LOJAS, lojaId, COLECOES.PEDIDOS, pedidoId);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error("Pedido não encontrado.");

  const data = snap.data();
  const itens = Array.isArray(data.itens) ? [...data.itens] : [];
  const item = itens[itemIndex] as Record<string, unknown> | undefined;
  if (!item) throw new Error("Item do pedido não encontrado.");

  const fotoUrl = String(item.fotoUrl ?? "").trim();
  const transform = item.transform as Transform | null | undefined;
  if (!fotoUrl || !transform) {
    throw new Error("Item sem foto/transform para gerar arte.");
  }

  const textos = (item.textos as TextoCapinha[] | null) ?? [];
  const config = (item.config as Record<string, unknown> | null) ?? {};
  const modeloId = String(item.modeloId ?? config.modeloId ?? "");
  const personalizacaoId =
    String(item.personalizacaoId ?? "").trim() ||
    `pedido-${pedidoId}-item-${itemIndex}`;

  const geo = geoH5PrintDoModelo(modeloId, config);
  const blob = await exportH5PrintArtBlob(
    [{ url: fotoUrl, transform }],
    transform,
    textos,
    undefined,
    geo,
  );

  const arteProducaoUrl = await subirArteProducao(
    userIdDonoArte,
    personalizacaoId,
    blob,
    "combinada",
  );

  itens[itemIndex] = {
    ...item,
    arteProducaoUrl,
  };

  await updateDoc(ref, {
    itens,
    atualizadoEm: serverTimestamp(),
  });

  if (item.personalizacaoId) {
    try {
      await updateDoc(doc(db, "personalizacoes", String(item.personalizacaoId)), {
        arteProducaoUrl,
      });
    } catch {
      // pedido já atualizado
    }
  }

  return { arteProducaoUrl };
}
