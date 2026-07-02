#!/usr/bin/env node
/**
 * Prova isolamento Fatia 1 — 3 cenários obrigatórios.
 *
 * Uso: npm run test:rules:multitenant
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, addDoc, collection } from "firebase/firestore";
import {
  pedidoExemplo,
  SEED_IDS,
  SEED_UIDS,
} from "./isolation-fixtures.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RULES_PATH = join(__dirname, "..", "firestore.rules");
const PROJECT_ID = "zenpro-multitenant-rules-test";

async function seedBase(testEnv) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();

    await setDoc(doc(db, "usuarios", SEED_UIDS.MARCA), {
      email: "marca@test.local",
      papel: "marca",
      lojaId: null,
    });

    await setDoc(doc(db, "usuarios", SEED_UIDS.REV_A), {
      email: "rev-a@test.local",
      papel: "revendedor",
      lojaId: SEED_IDS.LOJA_A,
    });

    await setDoc(doc(db, "usuarios", SEED_UIDS.REV_B), {
      email: "rev-b@test.local",
      papel: "revendedor",
      lojaId: SEED_IDS.LOJA_B,
    });

    await setDoc(doc(db, "lojas", SEED_IDS.LOJA_A), {
      nome: "Loja A",
      slug: "loja-a",
      donoUid: SEED_UIDS.REV_A,
      ativo: true,
      config: {},
    });

    await setDoc(doc(db, "lojas", SEED_IDS.LOJA_B), {
      nome: "Loja B",
      slug: "loja-b",
      donoUid: SEED_UIDS.REV_B,
      ativo: true,
      config: {},
    });

    await setDoc(
      doc(db, "lojas", SEED_IDS.LOJA_A, "pedidos", SEED_IDS.PEDIDO_A),
      pedidoExemplo("A"),
    );
    await setDoc(
      doc(db, "lojas", SEED_IDS.LOJA_B, "pedidos", SEED_IDS.PEDIDO_B),
      pedidoExemplo("B"),
    );
  });
}

function firestoreEmulatorConfig() {
  const hostEnv = process.env.FIRESTORE_EMULATOR_HOST;
  if (hostEnv) {
    const [host, port] = hostEnv.split(":");
    return { host, port: Number(port) };
  }
  return { host: "127.0.0.1", port: 8090 };
}

async function executarCaso(nome, fn) {
  try {
    await fn();
    return { nome, ok: true, detalhe: "PASS" };
  } catch (error) {
    return {
      nome,
      ok: false,
      detalhe: error instanceof Error ? error.message : String(error),
    };
  }
}

async function run() {
  const rules = readFileSync(RULES_PATH, "utf8");
  const emulator = firestoreEmulatorConfig();
  const testEnv = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: { rules, ...emulator },
  });

  try {
    await seedBase(testEnv);

    const marca = testEnv.authenticatedContext(SEED_UIDS.MARCA);
    const revA = testEnv.authenticatedContext(SEED_UIDS.REV_A);
    const cliente = testEnv.authenticatedContext(SEED_UIDS.CLIENTE);

    const pathPedidoA = doc(
      revA.firestore(),
      "lojas",
      SEED_IDS.LOJA_A,
      "pedidos",
      SEED_IDS.PEDIDO_A,
    );
    const pathPedidoB = doc(
      revA.firestore(),
      "lojas",
      SEED_IDS.LOJA_B,
      "pedidos",
      SEED_IDS.PEDIDO_B,
    );

    console.log("\n══════════════════════════════════════════════════════");
    console.log("  Teste de isolamento — Security Rules (Fatia 1)");
    console.log("══════════════════════════════════════════════════════");
    console.log(`  Loja A: ${SEED_IDS.LOJA_A}  |  Loja B: ${SEED_IDS.LOJA_B}`);
    console.log(`  Revendedor testado: uid-revendedor-loja-a (só loja A)`);
    console.log("──────────────────────────────────────────────────────\n");

    const resultados = [];

    // Caso 1: rev A NÃO lê pedido da loja B
    resultados.push(
      await executarCaso(
        "1. Revendedor loja A NÃO lê pedido da loja B",
        async () => {
          await assertFails(getDoc(pathPedidoB));
        },
      ),
    );

    // Caso 2: rev A lê próprio pedido
    resultados.push(
      await executarCaso(
        "2. Revendedor loja A lê pedido da própria loja A",
        async () => {
          await assertSucceeds(getDoc(pathPedidoA));
        },
      ),
    );

    // Caso 3: marca lê A e B
    resultados.push(
      await executarCaso(
        "3a. Marca lê pedido da loja A",
        async () => {
          await assertSucceeds(
            getDoc(
              doc(
                marca.firestore(),
                "lojas",
                SEED_IDS.LOJA_A,
                "pedidos",
                SEED_IDS.PEDIDO_A,
              ),
            ),
          );
        },
      ),
    );
    resultados.push(
      await executarCaso(
        "3b. Marca lê pedido da loja B",
        async () => {
          await assertSucceeds(
            getDoc(
              doc(
                marca.firestore(),
                "lojas",
                SEED_IDS.LOJA_B,
                "pedidos",
                SEED_IDS.PEDIDO_B,
              ),
            ),
          );
        },
      ),
    );

    // Caso 4: cliente cria pedido na loja A; rev B não lê
    const pedidoClienteRef = doc(
      cliente.firestore(),
      "lojas",
      SEED_IDS.LOJA_A,
      "pedidos",
      "pedido-cliente-e2e",
    );
    resultados.push(
      await executarCaso(
        "4a. Cliente autenticado cria pedido em loja A",
        async () => {
          await assertSucceeds(
            setDoc(pedidoClienteRef, {
              ...pedidoExemplo("Cliente E2E"),
              clienteUid: SEED_UIDS.CLIENTE,
              status: "pago",
            }),
          );
        },
      ),
    );
    resultados.push(
      await executarCaso(
        "4b. Revendedor loja B NÃO lê pedido criado na loja A",
        async () => {
          const revB = testEnv.authenticatedContext(SEED_UIDS.REV_B);
          await assertFails(getDoc(pedidoClienteRef));
        },
      ),
    );

    console.log("  Resultados:\n");
    for (const r of resultados) {
      const icon = r.ok ? "✅ PASS" : "❌ FAIL";
      console.log(`  ${icon}  ${r.nome}`);
      if (!r.ok) console.log(`         → ${r.detalhe}`);
    }

    const falhou = resultados.some((r) => !r.ok);
    console.log("\n──────────────────────────────────────────────────────");
    if (falhou) {
      console.log("  ❌ Isolamento NÃO validado — corrija firestore.rules\n");
      process.exitCode = 1;
    } else {
      console.log("  ✅ Isolamento validado — cenários OK\n");
    }
  } finally {
    await testEnv.cleanup();
  }
}

run().catch((error) => {
  console.error("\n❌ Erro ao rodar testes:", error);
  process.exit(1);
});
