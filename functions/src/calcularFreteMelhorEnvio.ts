import * as admin from "firebase-admin";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import {
  resolverOrigemExpedicaoPedido,
  type EnderecoExpedicao,
} from "./expedicaoOrigem";
import {
  DIMENSOES_PADRAO_CASE,
  isServicoFretePermitido,
  meFetch,
  melhorEnvioToken,
  type MelhorEnvioCotacao,
  type MelhorEnvioProdutoDim,
} from "./melhorEnvioShared";
import { MARCA_LOJA_ID } from "./mercadoPagoShared";

type ItemCotacao = {
  produtoId?: string;
  quantidade?: number;
  personalizacaoId?: string | null;
  precoCentavos?: number;
  nomeProduto?: string;
};

type CalcularFretePayload = {
  lojaId?: string;
  cepDestino?: string;
  itens?: ItemCotacao[];
};

function soDigitos(v: string): string {
  return v.replace(/\D/g, "");
}

function dimensoesProduto(data: Record<string, unknown> | undefined): {
  width: number;
  height: number;
  length: number;
  weightKg: number;
} {
  const largura = Number(data?.larguraCm ?? DIMENSOES_PADRAO_CASE.larguraCm);
  const altura = Number(data?.alturaCm ?? DIMENSOES_PADRAO_CASE.alturaCm);
  const comprimento = Number(
    data?.comprimentoCm ?? DIMENSOES_PADRAO_CASE.comprimentoCm,
  );
  const pesoG = Number(data?.pesoGramas ?? DIMENSOES_PADRAO_CASE.pesoGramas);
  return {
    width: Math.max(1, Math.round(largura)),
    height: Math.max(1, Math.round(altura)),
    length: Math.max(1, Math.round(comprimento)),
    weightKg: Math.max(0.01, pesoG / 1000),
  };
}

async function carregarExpedicaoLoja(
  lojaId: string,
): Promise<{ config: { expedicao?: EnderecoExpedicao | null } }> {
  const snap = await admin.firestore().doc(`lojas/${lojaId}`).get();
  const config = (snap.data()?.config ?? {}) as {
    expedicao?: EnderecoExpedicao | null;
  };
  return { config };
}

export const calcularFreteMelhorEnvio = onCall(
  {
    secrets: [melhorEnvioToken],
    region: "us-central1",
    cors: true,
    /** Evita cold start na cotação do checkout (~1–3s). */
    minInstances: 1,
  },
  async (request) => {
    const { lojaId, cepDestino, itens } = (request.data ??
      {}) as CalcularFretePayload;

    if (!lojaId) {
      throw new HttpsError("invalid-argument", "lojaId é obrigatório.");
    }
    const cepTo = soDigitos(String(cepDestino ?? ""));
    if (cepTo.length !== 8) {
      throw new HttpsError("invalid-argument", "CEP de destino inválido.");
    }
    if (!Array.isArray(itens) || itens.length === 0) {
      throw new HttpsError("invalid-argument", "Informe os itens do carrinho.");
    }

    const token = melhorEnvioToken.value();
    if (!token) {
      throw new HttpsError(
        "failed-precondition",
        "Melhor Envio não configurado (MELHOR_ENVIO_TOKEN).",
      );
    }

    const [lojaPedido, lojaZen] = await Promise.all([
      carregarExpedicaoLoja(lojaId),
      lojaId === MARCA_LOJA_ID
        ? Promise.resolve(null)
        : carregarExpedicaoLoja(MARCA_LOJA_ID),
    ]);

    const origem = resolverOrigemExpedicaoPedido(
      lojaId,
      itens.map((i) => ({ personalizacaoId: i.personalizacaoId ?? null })),
      lojaPedido.config,
      lojaZen?.config ?? lojaPedido.config,
    );

    const cepFrom = soDigitos(origem.endereco?.cep ?? "");
    if (cepFrom.length !== 8) {
      throw new HttpsError(
        "failed-precondition",
        "Cadastre o endereço de expedição (CEP) da loja de origem no admin.",
      );
    }

    const db = admin.firestore();
    const products: MelhorEnvioProdutoDim[] = (
      await Promise.all(
        itens.map(async (item) => {
          const produtoId = String(item.produtoId ?? "");
          const qty = Math.max(1, Number(item.quantidade ?? 1));
          if (!produtoId) return null;

          const snap = await db.doc(`produtos/${produtoId}`).get();
          const data = (snap.data() ?? {}) as Record<string, unknown>;
          const dim = dimensoesProduto(data);
          const unitPrice =
            Number(item.precoCentavos ?? data.precoBaseCentavos ?? 0) / 100;

          return {
            id: produtoId,
            width: dim.width,
            height: dim.height,
            length: dim.length,
            weight: dim.weightKg,
            insurance_value: Math.max(1, unitPrice),
            quantity: qty,
          } satisfies MelhorEnvioProdutoDim;
        }),
      )
    ).filter((p): p is MelhorEnvioProdutoDim => p != null);

    if (products.length === 0) {
      throw new HttpsError("invalid-argument", "Nenhum produto válido para frete.");
    }

    const raw = await meFetch<MelhorEnvioCotacao[] | MelhorEnvioCotacao>(
      token,
      "/me/shipment/calculate",
      {
        method: "POST",
        body: JSON.stringify({
          from: { postal_code: cepFrom },
          to: { postal_code: cepTo },
          products,
        }),
      },
    );

    const lista = Array.isArray(raw) ? raw : [raw];
    const opcoes = lista
      .filter(
        (o) =>
          o &&
          !o.error &&
          o.price != null &&
          isServicoFretePermitido({
            id: o.id,
            name: o.name,
            companyName: o.company?.name,
          }),
      )
      .map((o) => {
        const precoReais = Number(String(o.custom_price ?? o.price).replace(",", "."));
        const prazo =
          o.delivery_time ??
          o.delivery_range?.max ??
          o.delivery_range?.min ??
          null;
        return {
          servicoId: o.id,
          nome: o.name,
          empresa: o.company?.name ?? "",
          companyId: o.company?.id ?? null,
          precoCentavos: Math.round(precoReais * 100),
          prazoDias: prazo,
          picture: o.company?.picture ?? null,
        };
      })
      .sort((a, b) => a.precoCentavos - b.precoCentavos);

    return {
      cepOrigem: cepFrom,
      cepDestino: cepTo,
      origemLojaId: origem.lojaId,
      motivoOrigem: origem.motivo,
      opcoes,
    };
  },
);
