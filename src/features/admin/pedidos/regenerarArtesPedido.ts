import { doc, getDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import {
  exportCaseArtBlob,
  exportFotoArtBlob,
  exportTextoArtBlob,
} from "@/features/personalizacao/exportCaseArt";
import { subirArteProducao } from "@/features/personalizacao/uploadArteProducao";
import {
  resolveRockBodyMaskUrl,
  resolveRockCameraFrameUrl,
  resolveRockMolduraAspect,
} from "@/features/personalizacao/rockCameraAssets";
import { COLECOES } from "@/features/multitenant/types";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import type { Transform } from "@/features/personalizacao/types";
import type { TextoCapinha } from "@/features/personalizacao/caseTextFonts";

/**
 * Gera artes retangulares (estilo H5) para um item do pedido que ficou sem arte.
 * Usa a foto/transform gravados no item.
 */
export async function regenerarArtesItemPedidoAdmin(
  lojaId: string,
  pedidoId: string,
  itemIndex: number,
  userIdDonoArte: string,
): Promise<{
  arteProducaoUrl: string;
  arteFotoUrl: string;
  arteTextoUrl: string | null;
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
  const modeloId = String(
    item.modeloId ?? config.modeloId ?? "",
  );
  const personalizacaoId =
    String(item.personalizacaoId ?? "").trim() ||
    `pedido-${pedidoId}-item-${itemIndex}`;

  const geo = {
    larguraPx:
      typeof config.larguraPx === "number" ? config.larguraPx : undefined,
    alturaPx:
      typeof config.alturaPx === "number" ? config.alturaPx : undefined,
    maskUrl:
      resolveRockBodyMaskUrl(modeloId) ||
      (typeof config.maskUrl === "string" ? config.maskUrl : undefined),
    cameraFrameUrl: resolveRockCameraFrameUrl(modeloId),
    molduraAspect: resolveRockMolduraAspect(modeloId),
    corFundo:
      typeof config.corFundo === "string" ? config.corFundo : undefined,
  };

  const fotos = [{ url: fotoUrl, transform }];
  const [blobCombinada, blobFoto, blobTexto] = await Promise.all([
    exportCaseArtBlob(fotos, transform, textos, undefined, geo),
    exportFotoArtBlob(fotos, transform, undefined, geo),
    textos.length
      ? exportTextoArtBlob(transform, textos, undefined, geo)
      : Promise.resolve(null),
  ]);

  const [arteProducaoUrl, arteFotoUrl, arteTextoUrl] = await Promise.all([
    subirArteProducao(userIdDonoArte, personalizacaoId, blobCombinada, "combinada"),
    subirArteProducao(userIdDonoArte, personalizacaoId, blobFoto, "foto"),
    blobTexto
      ? subirArteProducao(userIdDonoArte, personalizacaoId, blobTexto, "texto")
      : Promise.resolve(null),
  ]);

  itens[itemIndex] = {
    ...item,
    arteProducaoUrl,
    arteFotoUrl,
    arteTextoUrl,
  };

  await updateDoc(ref, {
    itens,
    atualizadoEm: serverTimestamp(),
  });

  // Espelha na personalização se existir
  if (item.personalizacaoId) {
    try {
      await updateDoc(doc(db, "personalizacoes", String(item.personalizacaoId)), {
        arteProducaoUrl,
        arteFotoUrl,
        arteTextoUrl,
      });
    } catch {
      // pedido já atualizado
    }
  }

  return { arteProducaoUrl, arteFotoUrl, arteTextoUrl };
}
