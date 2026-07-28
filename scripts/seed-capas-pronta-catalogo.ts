#!/usr/bin/env node
/**
 * Cadastra capas prontas Zen Pro (estrutura OBLI: nome + preço + modelos).
 * Sem imagens — upload depois no admin.
 *
 * Uso:
 *   npx tsx scripts/seed-capas-pronta-catalogo.ts
 */
import { initializeApp, getApps, applicationDefault } from "firebase-admin/app";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { SEED_CATALOGO } from "../src/features/catalogo/types";

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "zenpro-capinhas";

/**
 * Modelos por SKU espelham as variações reais da OBLI (data-variacao-nome).
 * Não usar uma lista única de 14 iPhones em todos os produtos.
 */
const IPHONE_17_PRO_FAMILY = ["iphone-17-pro", "iphone-17-pro-max"] as const;
const IPHONE_17_ONLY = ["iphone-17"] as const;
const IPHONE_17_PRO_MAX = ["iphone-17-pro-max"] as const;

/** Brave Cinza OBLI: 17…13 (com 14 Pro Max; sem 16 / 15 Plus). */
const BRAVE_CINZA = [
  "iphone-17",
  "iphone-17-pro",
  "iphone-17-pro-max",
  "iphone-15-pro-max",
  "iphone-15-pro",
  "iphone-15",
  "iphone-14-pro-max",
  "iphone-14-pro",
  "iphone-14",
  "iphone-13",
] as const;

/** Brave Azul OBLI: igual Cinza, sem 14 Pro Max. */
const BRAVE_AZUL = [
  "iphone-17",
  "iphone-17-pro",
  "iphone-17-pro-max",
  "iphone-15-pro-max",
  "iphone-15-pro",
  "iphone-15",
  "iphone-14",
  "iphone-13",
] as const;

/** Smart OBLI: 16 Pro Max → 14 Pro (+ 17 family + 15 Plus). */
const SMART = [
  "iphone-16-pro-max",
  "iphone-17",
  "iphone-17-pro",
  "iphone-17-pro-max",
  "iphone-16-pro",
  "iphone-16",
  "iphone-15-pro-max",
  "iphone-15-pro",
  "iphone-15-plus",
  "iphone-15",
  "iphone-14-pro",
] as const;

/** MagSafe Azul (linha antiga) OBLI: 16, 15…, 14, 13. */
const MAGSAFE_AZUL = [
  "iphone-16",
  "iphone-15-pro-max",
  "iphone-15-pro",
  "iphone-15",
  "iphone-14",
  "iphone-13",
] as const;

/** MagSafe Desert OBLI: só 16 Pro / 16 Pro Max. */
const MAGSAFE_DESERT = ["iphone-16-pro-max", "iphone-16-pro"] as const;

/** Smart MagSafe OBLI: 16 Pro Max → 13 (sem 14 Pro Max / 15 Plus / 17). */
const SMART_MAGSAFE = [
  "iphone-16-pro-max",
  "iphone-16-pro",
  "iphone-16",
  "iphone-15-pro-max",
  "iphone-15-pro",
  "iphone-15",
  "iphone-14-pro",
  "iphone-14",
  "iphone-13",
] as const;

/** MagSafe Preta/Cinza (multi) OBLI: 16 Pro Max → 13 (com 14 Pro Max). */
const MAGSAFE_MULTI_16 = [
  "iphone-16-pro-max",
  "iphone-16-pro",
  "iphone-16",
  "iphone-15-pro-max",
  "iphone-15-pro",
  "iphone-15",
  "iphone-14-pro-max",
  "iphone-14-pro",
  "iphone-14",
  "iphone-13",
] as const;

type ProdutoSeed = {
  id: string;
  nome: string;
  descricao: string;
  precoBaseCentavos: number;
  precoRevendedorCentavos: number;
  modelosCompativeis: readonly string[];
  destaque?: string | null;
  material?: string | null;
};

const PRECO_BRAVE = 19990;
const PRECO_MAGSAFE = 24990;
const PRECO_REV_BRAVE = 14990;
const PRECO_REV_MAGSAFE = 18990;

const PRODUTOS: ProdutoSeed[] = [
  {
    id: "capa-brave-cinza",
    nome: "Capa Brave Cinza",
    descricao:
      "Capinha Brave com moldura cinza e verso fosco. Proteção reforçada nas bordas e módulo de câmera.",
    precoBaseCentavos: PRECO_BRAVE,
    precoRevendedorCentavos: PRECO_REV_BRAVE,
    modelosCompativeis: BRAVE_CINZA,
  },
  {
    id: "capa-brave-azul",
    nome: "Capa Brave Azul",
    descricao:
      "Capinha Brave com moldura azul e verso fosco. Encaixe preciso e proteção de impacto.",
    precoBaseCentavos: PRECO_BRAVE,
    precoRevendedorCentavos: PRECO_REV_BRAVE,
    modelosCompativeis: BRAVE_AZUL,
  },
  {
    id: "capa-brave-rosa-17",
    nome: "Capa Brave Rosa",
    descricao: "Capinha Brave rosa para iPhone 17. Design elegante e proteção nas bordas.",
    precoBaseCentavos: PRECO_BRAVE,
    precoRevendedorCentavos: PRECO_REV_BRAVE,
    modelosCompativeis: IPHONE_17_ONLY,
  },
  {
    id: "capa-brave-preta-17-pro-max",
    nome: "Capa Brave Preta",
    descricao: "Capinha Brave preta para iPhone 17 Pro Max. Acabamento fosco e moldura reforçada.",
    precoBaseCentavos: PRECO_BRAVE,
    precoRevendedorCentavos: PRECO_REV_BRAVE,
    modelosCompativeis: IPHONE_17_PRO_MAX,
  },
  {
    id: "capa-brave-laranja-17-pro",
    nome: "Capa Brave Laranja",
    descricao: "Capinha Brave laranja para iPhone 17 Pro e 17 Pro Max.",
    precoBaseCentavos: PRECO_BRAVE,
    precoRevendedorCentavos: PRECO_REV_BRAVE,
    modelosCompativeis: IPHONE_17_PRO_FAMILY,
  },
  {
    id: "capa-brave-cinza-17-pro",
    nome: "Capa Brave Cinza Pro",
    descricao: "Capinha Brave cinza para iPhone 17 Pro e 17 Pro Max.",
    precoBaseCentavos: PRECO_BRAVE,
    precoRevendedorCentavos: PRECO_REV_BRAVE,
    modelosCompativeis: IPHONE_17_PRO_FAMILY,
  },
  {
    id: "capa-brave-azul-17-pro",
    nome: "Capa Brave Azul Pro",
    descricao: "Capinha Brave azul para iPhone 17 Pro e 17 Pro Max.",
    precoBaseCentavos: PRECO_BRAVE,
    precoRevendedorCentavos: PRECO_REV_BRAVE,
    modelosCompativeis: IPHONE_17_PRO_FAMILY,
  },
  {
    id: "capa-brave-preta-17-pro",
    nome: "Capa Brave Preta Pro",
    descricao: "Capinha Brave preta para iPhone 17 Pro e 17 Pro Max.",
    precoBaseCentavos: PRECO_BRAVE,
    precoRevendedorCentavos: PRECO_REV_BRAVE,
    modelosCompativeis: IPHONE_17_PRO_FAMILY,
  },
  {
    id: "capa-smart",
    nome: "Capa Smart",
    descricao:
      "Capinha Smart transparente com bordas texturizadas e proteção de câmera. Kit visual limpo.",
    precoBaseCentavos: PRECO_BRAVE,
    precoRevendedorCentavos: PRECO_REV_BRAVE,
    modelosCompativeis: SMART,
  },
  {
    id: "capa-brave-magsafe-azul",
    nome: "Capa Brave MagSafe Azul",
    descricao:
      "Capinha Brave com MagSafe, moldura azul e anel magnético. Compatível com carregadores MagSafe.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: MAGSAFE_AZUL,
    destaque: "MagSafe",
  },
  {
    id: "capa-brave-magsafe-laranja-17-pro",
    nome: "Capa Brave MagSafe Laranja",
    descricao: "Brave MagSafe laranja para iPhone 17 Pro e 17 Pro Max.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: IPHONE_17_PRO_FAMILY,
    destaque: "MagSafe",
  },
  {
    id: "capa-brave-magsafe-preta-17-pro-max",
    nome: "Capa Brave MagSafe Preta Pro Max",
    descricao: "Brave MagSafe preta para iPhone 17 Pro Max.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: IPHONE_17_PRO_MAX,
    destaque: "MagSafe",
  },
  {
    id: "capa-brave-magsafe-roxa-17",
    nome: "Capa Brave MagSafe Roxa",
    descricao: "Brave MagSafe roxa para iPhone 17.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: IPHONE_17_ONLY,
    destaque: "MagSafe",
  },
  {
    id: "capa-brave-magsafe-cinza-17-pro",
    nome: "Capa Brave MagSafe Cinza Pro",
    descricao: "Brave MagSafe cinza para iPhone 17 Pro e 17 Pro Max.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: IPHONE_17_PRO_FAMILY,
    destaque: "MagSafe",
  },
  {
    id: "capa-brave-magsafe-azul-17-pro",
    nome: "Capa Brave MagSafe Azul Pro",
    descricao: "Brave MagSafe azul para iPhone 17 Pro e 17 Pro Max.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: IPHONE_17_PRO_FAMILY,
    destaque: "MagSafe",
  },
  {
    id: "capa-brave-magsafe-preta-17-pro",
    nome: "Capa Brave MagSafe Preta Pro",
    descricao: "Brave MagSafe preta para iPhone 17 Pro e 17 Pro Max.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: IPHONE_17_PRO_FAMILY,
    destaque: "MagSafe",
  },
  {
    id: "capa-brave-magsafe-desert",
    nome: "Capa Brave MagSafe Desert",
    descricao: "Brave MagSafe tom desert/areia com anel magnético.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: MAGSAFE_DESERT,
    destaque: "MagSafe",
  },
  {
    id: "capa-smart-magsafe",
    nome: "Capa Smart MagSafe",
    descricao: "Capinha Smart transparente com MagSafe e bordas reforçadas.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: SMART_MAGSAFE,
    destaque: "MagSafe",
  },
  {
    id: "capa-brave-magsafe-preta",
    nome: "Capa Brave MagSafe Preta",
    descricao: "Brave MagSafe preta / smoke com anel magnético.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: MAGSAFE_MULTI_16,
    destaque: "MagSafe",
  },
  {
    id: "capa-brave-magsafe-cinza",
    nome: "Capa Brave MagSafe Cinza",
    descricao: "Brave MagSafe cinza fosco com anel magnético.",
    precoBaseCentavos: PRECO_MAGSAFE,
    precoRevendedorCentavos: PRECO_REV_MAGSAFE,
    modelosCompativeis: MAGSAFE_MULTI_16,
    destaque: "MagSafe",
  },
];

function initAdmin() {
  if (getApps().length > 0) return;
  initializeApp({
    credential: applicationDefault(),
    projectId,
  });
}

async function main() {
  initAdmin();
  const db = getFirestore();
  let ok = 0;

  for (const p of PRODUTOS) {
    const ref = db.collection("produtos").doc(p.id);
    await ref.set(
      {
        nome: p.nome,
        descricao: p.descricao,
        precoBaseCentavos: p.precoBaseCentavos,
        precoRevendedorCentavos: p.precoRevendedorCentavos,
        pedidoMinimoRevendedorCentavos: 0,
        faixasPrecoRevendedor: [],
        imagens: [],
        ativo: true,
        tipoId: SEED_CATALOGO.TIPO_CAPINHA,
        modoVenda: "pronta",
        tipo: "pronta",
        personalizavel: false,
        material: p.material ?? "hibrida",
        controlaEstoque: false,
        estoqueCentral: 0,
        categoria: "capinhas",
        marcaId: SEED_CATALOGO.MARCA_APPLE,
        modelosCompativeis: [...p.modelosCompativeis],
        modeloId: p.modelosCompativeis[0],
        marca: "Apple",
        destaque: p.destaque ?? null,
        pesoGramas: 45,
        alturaCm: 16,
        larguraCm: 8,
        comprimentoCm: 2,
        pagamento: {
          aceitaPix: true,
          aceitaBoleto: true,
          aceitaCartao: true,
          maxParcelasCartao: 6,
        },
        atualizadoEm: FieldValue.serverTimestamp(),
        criadoEm: FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    ok += 1;
    console.log(`OK ${p.id} — ${p.nome} (${p.modelosCompativeis.length} modelos)`);
  }

  console.log(`\n${ok} produtos prontos cadastrados em ${projectId} (sem imagens).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
