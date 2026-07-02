#!/usr/bin/env node
/**
 * Seed multi-tenant — 2 lojas (A e B), 1 revendedor em cada, 1 pedido em cada.
 *
 * Uso:
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\caminho\service-account.json"
 *   npm run seed:multitenant
 */
import { readFileSync } from "node:fs";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import {
  COLECOES_CATALOGO,
  getCatalogoCentralSeed,
  getMarcasSeed,
  getModelosCelularSeed,
  getModelosSeed,
  getTiposSeed,
  MARCA_LOJA_ID,
  MARCA_LOJA_NOME,
  MARCA_LOJA_SLUG,
  SEED_AUTH,
  SEED_IDS,
} from "../src/features/multitenant/catalogoSeedData";

const projectId =
  process.env.FIREBASE_PROJECT_ID ||
  process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ||
  "zenpro-capinhas";

function initAdmin() {
  if (getApps().length > 0) return;

  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (saPath) {
    const serviceAccount = JSON.parse(readFileSync(saPath, "utf8"));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || projectId,
    });
    return;
  }

  initializeApp({ projectId });
}

async function obterOuCriarUsuario(
  auth: ReturnType<typeof getAuth>,
  email: string,
  senha: string,
  displayName: string,
) {
  try {
    const existente = await auth.getUserByEmail(email);
    await auth.updateUser(existente.uid, {
      password: senha,
      displayName,
      emailVerified: true,
    });
    return auth.getUser(existente.uid);
  } catch (error: unknown) {
    const code = (error as { code?: string }).code;
    if (code !== "auth/user-not-found") throw error;
    return auth.createUser({
      email,
      password: senha,
      displayName,
      emailVerified: true,
    });
  }
}

function pedidoExemplo(lojaRotulo: string, comPersonalizacao = false) {
  const itemBase = {
    produtoId: "cap-iphone15-classic",
    modeloId: "iphone-15",
    nomeProduto: "Capinha Personalizada iPhone 15",
    personalizacaoId: comPersonalizacao ? "pers-seed-demo" : null,
    precoCentavos: 4990,
    quantidade: 1,
  };

  if (comPersonalizacao) {
    return {
      itens: [
        {
          ...itemBase,
          fotoUrl: "/brand/hero-demo.jpg",
          transform: { x: -8, y: 52, scale: 0.52, rotation: 0 },
          textos: [
            {
              id: "seed-texto",
              conteudo: "Cliente Zen ✨",
              x: 140,
              y: 368,
              fontSize: 22,
              fontId: "pacifico",
              fill: "#ffffff",
              rotation: 0,
              align: "center",
              fontStyle: "bold",
            },
          ],
          titulo: "Capinha demo seed",
          descricao: "Personalização embutida no pedido (fatia 4)",
        },
      ],
      totalCentavos: 4990,
      status: "aguardando_pagamento" as const,
      cliente: {
        nome: `Cliente ${lojaRotulo}`,
        contato: `cliente-${lojaRotulo.toLowerCase()}@test.local`,
        endereco: "Rua Teste, 1 — São Paulo/SP",
      },
      pagamento: { provider: null, id: null, status: null },
    };
  }

  return {
    itens: [itemBase],
    totalCentavos: 4990,
    status: "aguardando_pagamento" as const,
    cliente: {
      nome: `Cliente ${lojaRotulo}`,
      contato: `cliente-${lojaRotulo.toLowerCase()}@test.local`,
      endereco: "Rua Teste, 1 — São Paulo/SP",
    },
    pagamento: { provider: null, id: null, status: null },
  };
}

async function main() {
  initAdmin();
  const auth = getAuth();
  const db = getFirestore();
  const now = FieldValue.serverTimestamp();

  console.log(`\n🌱 Seed isolamento multi-tenant — projeto: ${projectId}\n`);

  const marcaUser = await obterOuCriarUsuario(
    auth,
    SEED_AUTH.MARCA_EMAIL,
    SEED_AUTH.MARCA_SENHA,
    "Admin Marca Zen Pro",
  );
  const revA = await obterOuCriarUsuario(
    auth,
    SEED_AUTH.REVENDEDOR_A_EMAIL,
    SEED_AUTH.REVENDEDOR_A_SENHA,
    "Revendedor Loja A",
  );
  const revB = await obterOuCriarUsuario(
    auth,
    SEED_AUTH.REVENDEDOR_B_EMAIL,
    SEED_AUTH.REVENDEDOR_B_SENHA,
    "Revendedor Loja B",
  );

  console.log("✓ Auth marca:      ", marcaUser.uid);
  console.log("✓ Auth rev loja A: ", revA.uid);
  console.log("✓ Auth rev loja B: ", revB.uid);

  const batch = db.batch();
  const produtos = getCatalogoCentralSeed();
  const tipos = getTiposSeed();
  const marcas = getMarcasSeed();
  const modelosNovos = getModelosSeed();
  const modelos = getModelosCelularSeed();

  batch.set(
    db.doc(`usuarios/${marcaUser.uid}`),
    {
      email: SEED_AUTH.MARCA_EMAIL,
      nomeCompleto: "Admin Marca Zen Pro",
      papel: "marca",
      lojaId: null,
      atualizadoEm: now,
    },
    { merge: true },
  );

  batch.set(
    db.doc(`usuarios/${revA.uid}`),
    {
      email: SEED_AUTH.REVENDEDOR_A_EMAIL,
      nomeCompleto: "Revendedor Loja A",
      papel: "revendedor",
      lojaId: SEED_IDS.LOJA_A,
      atualizadoEm: now,
    },
    { merge: true },
  );

  batch.set(
    db.doc(`usuarios/${revB.uid}`),
    {
      email: SEED_AUTH.REVENDEDOR_B_EMAIL,
      nomeCompleto: "Revendedor Loja B",
      papel: "revendedor",
      lojaId: SEED_IDS.LOJA_B,
      atualizadoEm: now,
    },
    { merge: true },
  );

  // Loja oficial do dono (raiz do site "/")
  batch.set(
    db.doc(`lojas/${MARCA_LOJA_ID}`),
    {
      nome: MARCA_LOJA_NOME,
      slug: MARCA_LOJA_SLUG,
      donoUid: marcaUser.uid,
      donoEmail: SEED_AUTH.MARCA_EMAIL,
      ativo: true,
      config: { logo: null, cor: "#18181b", whatsapp: null },
      criadoEm: now,
      atualizadoEm: now,
    },
    { merge: true },
  );

  batch.set(
    db.doc(`lojas/${SEED_IDS.LOJA_A}`),
    {
      nome: "Loja A",
      slug: "loja-a",
      donoUid: revA.uid,
      ativo: true,
      config: { logo: null, cor: "#18181b", whatsapp: "5511111111111" },
      criadoEm: now,
      atualizadoEm: now,
    },
    { merge: true },
  );

  batch.set(
    db.doc(`lojas/${SEED_IDS.LOJA_B}`),
    {
      nome: "Loja B",
      slug: "loja-b",
      donoUid: revB.uid,
      ativo: true,
      config: { logo: null, cor: "#3b82f6", whatsapp: "5511222222222" },
      criadoEm: now,
      atualizadoEm: now,
    },
    { merge: true },
  );

  for (const { id, ...dados } of tipos) {
    batch.set(
      db.doc(`${COLECOES_CATALOGO.TIPOS}/${id}`),
      { ...dados, criadoEm: now, atualizadoEm: now },
      { merge: true },
    );
  }

  for (const { id, ...dados } of marcas) {
    batch.set(
      db.doc(`${COLECOES_CATALOGO.MARCAS}/${id}`),
      { ...dados, criadoEm: now, atualizadoEm: now },
      { merge: true },
    );
  }

  for (const { id, ...dados } of modelosNovos) {
    batch.set(
      db.doc(`${COLECOES_CATALOGO.MODELOS}/${id}`),
      { ...dados, criadoEm: now, atualizadoEm: now },
      { merge: true },
    );
  }

  for (const { id, ...dados } of produtos) {
    batch.set(
      db.doc(`produtos/${id}`),
      { ...dados, criadoEm: now, atualizadoEm: now },
      { merge: true },
    );
  }

  for (const { id, ...dados } of modelos) {
    batch.set(
      db.doc(`modelos_celular/${id}`),
      { ...dados, criadoEm: now, atualizadoEm: now },
      { merge: true },
    );
  }

  batch.set(
    db.doc(`lojas/${SEED_IDS.LOJA_A}/pedidos/${SEED_IDS.PEDIDO_A}`),
    { ...pedidoExemplo("Loja A", true), criadoEm: now },
    { merge: true },
  );

  batch.set(
    db.doc(`lojas/${SEED_IDS.LOJA_B}/pedidos/${SEED_IDS.PEDIDO_B}`),
    { ...pedidoExemplo("Loja B", false), criadoEm: now },
    { merge: true },
  );

  await batch.commit();

  console.log(`\n✓ Loja A (${SEED_IDS.LOJA_A}) — rev ${SEED_AUTH.REVENDEDOR_A_EMAIL}`);
  console.log(`✓ Loja B (${SEED_IDS.LOJA_B}) — rev ${SEED_AUTH.REVENDEDOR_B_EMAIL}`);
  console.log(`✓ Pedido A: lojas/${SEED_IDS.LOJA_A}/pedidos/${SEED_IDS.PEDIDO_A}`);
  console.log(`✓ Pedido B: lojas/${SEED_IDS.LOJA_B}/pedidos/${SEED_IDS.PEDIDO_B}`);
  console.log(`✓ ${tipos.length} tipos + ${marcas.length} marcas + ${modelosNovos.length} modelos`);
  console.log(`✓ ${produtos.length} produtos + ${modelos.length} modelos_celular (legado)`);
  console.log("\nRodar testes: npm run test:rules:multitenant\n");
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("\n❌ Seed falhou:", message);
  console.error(
    "\nDefina GOOGLE_APPLICATION_CREDENTIALS com a service account do projeto.",
  );
  process.exit(1);
});
