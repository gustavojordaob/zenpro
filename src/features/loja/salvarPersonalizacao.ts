import {
  addDoc,
  collection,
  serverTimestamp,
  updateDoc,
} from "firebase/firestore";
import { personalizacaoParaConfig } from "@/features/catalogo/personalizacaoConfig";
import type { TipoPersonalizacao } from "@/features/catalogo/types";
import type { Personalizacao } from "@/features/personalizacao/types";
import {
  exportCaseArtBlob,
  exportFotoArtBlob,
  exportTextoArtBlob,
  type FotoExportInput,
} from "@/features/personalizacao/exportCaseArt";
import { subirArteProducao } from "@/features/personalizacao/uploadArteProducao";
import {
  resolveRockBodyMaskUrl,
  resolveRockCameraFrameUrl,
  resolveRockMolduraAspect,
} from "@/features/personalizacao/rockCameraAssets";
import { getFirebaseDb, isFirebaseConfigured } from "@/lib/firebase";
import { sanitizarParaFirestore } from "@/lib/firestoreSanitize";
import type { PersonalizacaoFirestore } from "./firestoreTypes";

type SalvarPersonalizacaoInput = {
  dados: Personalizacao;
  userId: string;
  tipoPersonalizacao?: TipoPersonalizacao;
  /** Fontes locais (blob:) — preferir sobre Storage para export sem CORS. */
  fotosExport?: FotoExportInput[];
};

export type ArtesPersonalizacao = {
  /** Foto + texto, na forma do modelo (produção). */
  arteProducaoUrl: string | null;
  /** Só a foto do cliente (sem texto). */
  arteFotoUrl: string | null;
  /** Só o texto do cliente, fundo transparente. */
  arteTextoUrl: string | null;
};

export async function salvarPersonalizacao({
  dados,
  userId,
  tipoPersonalizacao = "mascara_modelo",
  fotosExport,
}: SalvarPersonalizacaoInput): Promise<{ id: string } & ArtesPersonalizacao> {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase não configurado.");
  }

  const db = getFirebaseDb();
  const config = personalizacaoParaConfig(dados);
  const textos = dados.textos ?? [];
  const temTexto = textos.length > 0;

  const payload: Omit<
    PersonalizacaoFirestore,
    "criadoEm" | "arteProducaoUrl" | "arteFotoUrl" | "arteTextoUrl"
  > & {
    criadoEm: ReturnType<typeof serverTimestamp>;
    arteProducaoUrl: string | null;
    arteFotoUrl: string | null;
    arteTextoUrl: string | null;
  } = {
    userId,
    tipoPersonalizacao,
    fotoUrl: dados.fotoUrl,
    config,
    modeloId: dados.modeloId,
    transform: dados.transform,
    textos: temTexto ? textos : null,
    titulo: dados.titulo?.trim() || null,
    descricao: dados.descricao?.trim() || null,
    arteProducaoUrl: null,
    arteFotoUrl: null,
    arteTextoUrl: null,
    criadoEm: serverTimestamp(),
  };

  const ref = await addDoc(
    collection(db, "personalizacoes"),
    sanitizarParaFirestore(payload),
  );

  const fotosParaArte: FotoExportInput[] =
    fotosExport?.length
      ? fotosExport
      : dados.fotos?.length
        ? dados.fotos.map((f) => ({ url: f.fotoUrl, transform: f.transform }))
        : [{ url: dados.fotoUrl, transform: dados.transform }];

  const transformRef = fotosParaArte[0]?.transform ?? dados.transform;
  const bodyMask =
    resolveRockBodyMaskUrl(dados.modeloId) || dados.maskUrl;
  const geo = {
    larguraPx: dados.larguraPx,
    alturaPx: dados.alturaPx,
    // Silhueta H5 (borda da capa) — não o mask genérico iPhone se houver Rock.
    maskUrl: bodyMask,
    cameraFrameUrl:
      dados.cameraFrameUrl || resolveRockCameraFrameUrl(dados.modeloId),
    molduraAspect:
      dados.molduraAspect || resolveRockMolduraAspect(dados.modeloId),
    corFundo: dados.corFundo,
  };

  try {
    const [blobCombinada, blobFoto, blobTexto] = await Promise.all([
      exportCaseArtBlob(fotosParaArte, transformRef, textos, undefined, geo),
      exportFotoArtBlob(fotosParaArte, transformRef, undefined, geo),
      temTexto
        ? exportTextoArtBlob(transformRef, textos, undefined, geo)
        : Promise.resolve(null),
    ]);

    const [arteProducaoUrl, arteFotoUrl, arteTextoUrl] = await Promise.all([
      subirArteProducao(userId, ref.id, blobCombinada, "combinada"),
      subirArteProducao(userId, ref.id, blobFoto, "foto"),
      blobTexto
        ? subirArteProducao(userId, ref.id, blobTexto, "texto")
        : Promise.resolve(null),
    ]);

    await updateDoc(ref, { arteProducaoUrl, arteFotoUrl, arteTextoUrl });
    return { id: ref.id, arteProducaoUrl, arteFotoUrl, arteTextoUrl };
  } catch (error) {
    console.error("Falha ao gerar arte de produção:", error);
    // Sem artes o dono não imprime — não engolir o erro no carrinho.
    throw error instanceof Error
      ? error
      : new Error("Não foi possível gerar a arte de produção.");
  }
}
