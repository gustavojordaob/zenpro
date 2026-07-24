#!/usr/bin/env node
/**
 * Cria/atualiza contas admin via REST (sem service account).
 * Se GOOGLE_APPLICATION_CREDENTIALS estiver definido, também reseta senha
 * de contas existentes via Admin SDK.
 *
 * Uso: npm run seed:admin-auth
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

function loadEnvLocal() {
  try {
    const raw = readFileSync(join(root, ".env.local"), "utf8");
    const env = {};
    for (const line of raw.split("\n")) {
      const m = line.match(/^([^#=]+)=(.*)$/);
      if (m) env[m[1].trim()] = m[2].trim();
    }
    return env;
  } catch {
    return {};
  }
}

const env = loadEnvLocal();
const API_KEY = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const PROJECT_ID =
  env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "zenpro-capinhas";

const CONTAS = [
  {
    email: "marca@zenpro.test",
    password: "MarcaZenpro123!",
    displayName: "Admin Marca",
  },
  {
    email: "revendedor-a@zenpro.test",
    password: "RevendedorA123!",
    displayName: "Revendedor Loja A",
  },
  {
    email: "revendedor-b@zenpro.test",
    password: "RevendedorB123!",
    displayName: "Revendedor Loja B",
  },
];

async function signIn(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, code: data.error?.message ?? "unknown" };
  }
  return { ok: true, uid: data.localId, email };
}

async function signUp(email, password) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    },
  );
  const data = await res.json();
  if (!res.ok) {
    return { ok: false, code: data.error?.message ?? "unknown" };
  }
  return { ok: true, uid: data.localId, email, created: true };
}

async function resetSenhaAdmin(email, password, displayName) {
  const saPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!saPath) return false;

  const { cert, getApps, initializeApp } = await import("firebase-admin/app");
  const { getAuth } = await import("firebase-admin/auth");

  if (getApps().length === 0) {
    const serviceAccount = JSON.parse(readFileSync(saPath, "utf8"));
    initializeApp({
      credential: cert(serviceAccount),
      projectId: serviceAccount.project_id || PROJECT_ID,
    });
  }

  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, {
    password,
    displayName,
    emailVerified: true,
  });
  return true;
}

async function garantirConta(conta) {
  const login = await signIn(conta.email, conta.password);
  if (login.ok) {
    console.log(`✓ Senha OK: ${conta.email} (${login.uid})`);
    return { email: conta.email, uid: login.uid, status: "ok" };
  }

  const criacao = await signUp(conta.email, conta.password);
  if (criacao.ok) {
    console.log(`✓ Criado: ${conta.email} (${criacao.uid})`);
    return { email: conta.email, uid: criacao.uid, status: "created" };
  }

  if (criacao.code === "EMAIL_EXISTS") {
    const resetou = await resetSenhaAdmin(
      conta.email,
      conta.password,
      conta.displayName,
    );
    if (resetou) {
      const retry = await signIn(conta.email, conta.password);
      if (retry.ok) {
        console.log(`✓ Senha resetada: ${conta.email} (${retry.uid})`);
        return { email: conta.email, uid: retry.uid, status: "reset" };
      }
    }

    console.log(
      `✗ ${conta.email} existe mas a senha do seed não funciona.`,
    );
    console.log(
      "  → Defina GOOGLE_APPLICATION_CREDENTIALS e rode npm run seed:admin-auth de novo",
    );
    console.log("  → Ou resete a senha no Firebase Console → Authentication");
    return { email: conta.email, status: "senha_incorreta" };
  }

  throw new Error(`${conta.email}: ${criacao.code}`);
}

async function main() {
  if (!API_KEY) {
    console.error("❌ NEXT_PUBLIC_FIREBASE_API_KEY não encontrada em .env.local");
    process.exit(1);
  }

  console.log(`\n🔐 Contas admin — projeto ${PROJECT_ID}\n`);

  const resultados = [];
  for (const conta of CONTAS) {
    resultados.push(await garantirConta(conta));
  }

  const falhas = resultados.filter((r) => r.status === "senha_incorreta");
  if (falhas.length > 0) {
    console.log("\n⚠️  Firestore (papel, lojas): npm run seed:multitenant com service account");
    process.exit(1);
  }

  console.log("\n✅ Todas as contas autenticam com as senhas do seed.");
  console.log("   Login: https://usezenpro.com.br/admin/login");
  console.log("\n   Se entrar mas aparecer 'sem permissão de admin',");
  console.log("   sincronize usuarios/{uid} no Firestore (seed:multitenant ou Console).\n");
}

main().catch((e) => {
  console.error("❌", e.message || e);
  process.exit(1);
});
