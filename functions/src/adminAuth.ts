import * as admin from "firebase-admin";
import { HttpsError } from "firebase-functions/v2/https";

type UsuarioAdmin = {
  papel: string;
  lojaId?: string;
};

export async function obterUsuarioAdmin(
  uid: string,
): Promise<UsuarioAdmin | null> {
  const snap = await admin.firestore().doc(`usuarios/${uid}`).get();
  if (!snap.exists) return null;
  const data = snap.data() ?? {};
  return {
    papel: String(data.papel ?? ""),
    lojaId: data.lojaId ? String(data.lojaId) : undefined,
  };
}

export async function assertPodeGerenciarPedidoLoja(
  uid: string,
  lojaId: string,
): Promise<void> {
  const usuario = await obterUsuarioAdmin(uid);
  if (!usuario) {
    throw new HttpsError("permission-denied", "Usuário não autorizado.");
  }
  if (usuario.papel === "marca") return;
  if (usuario.papel === "revendedor" && usuario.lojaId === lojaId) return;
  throw new HttpsError("permission-denied", "Sem permissão para este pedido.");
}
