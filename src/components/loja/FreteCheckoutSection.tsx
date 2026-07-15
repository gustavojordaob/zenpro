"use client";

import { useEffect, useState } from "react";
import {
  calcularFreteMelhorEnvio,
  type OpcaoFreteMelhorEnvio,
} from "@/features/envios/melhorEnvioClient";
import {
  avisoPrazoFreteCheckout,
  pedidoTemPersonalizacao,
  textoPrazoFreteOpcao,
} from "@/features/envios/prazoFreteCopy";
import { formatarPreco } from "@/features/loja/produtosMock";

type ItemFrete = {
  produtoId: string;
  quantidade: number;
  personalizacaoId?: string | null;
  precoCentavos: number;
};

type Props = {
  lojaId: string;
  cepPadrao?: string;
  itens: ItemFrete[];
  freteGratis?: boolean;
  selecionada: OpcaoFreteMelhorEnvio | null;
  onSelecionar: (opcao: OpcaoFreteMelhorEnvio | null, meta: {
    cepOrigem: string;
    cepDestino: string;
    origemLojaId: string;
  }) => void;
};

export function FreteCheckoutSection({
  lojaId,
  cepPadrao = "",
  itens,
  freteGratis = false,
  selecionada,
  onSelecionar,
}: Props) {
  const [cep, setCep] = useState(cepPadrao.replace(/\D/g, ""));
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [opcoes, setOpcoes] = useState<OpcaoFreteMelhorEnvio[]>([]);
  const [meta, setMeta] = useState({
    cepOrigem: "",
    cepDestino: "",
    origemLojaId: "",
  });
  const personalizado = pedidoTemPersonalizacao(itens);

  useEffect(() => {
    setCep(cepPadrao.replace(/\D/g, ""));
  }, [cepPadrao]);

  async function cotar() {
    setErro(null);
    const digitos = cep.replace(/\D/g, "");
    if (digitos.length !== 8) {
      setErro("Digite um CEP válido com 8 dígitos.");
      return;
    }
    setCarregando(true);
    onSelecionar(null, { cepOrigem: "", cepDestino: digitos, origemLojaId: "" });
    try {
      const res = await calcularFreteMelhorEnvio({
        lojaId,
        cepDestino: digitos,
        itens,
      });
      setOpcoes(res.opcoes);
      const nextMeta = {
        cepOrigem: res.cepOrigem,
        cepDestino: res.cepDestino,
        origemLojaId: res.origemLojaId,
      };
      setMeta(nextMeta);
      if (res.opcoes.length === 0) {
        setErro("Nenhuma transportadora disponível para este CEP.");
      } else {
        onSelecionar(res.opcoes[0], nextMeta);
      }
    } catch (e) {
      console.error(e);
      setOpcoes([]);
      setErro(
        e instanceof Error ? e.message : "Falha ao calcular frete. Tente de novo.",
      );
    } finally {
      setCarregando(false);
    }
  }

  return (
    <section className="mt-8 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
        Frete
      </h2>
      {freteGratis && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          Benefício do nível: frete grátis nesta compra.
        </p>
      )}
      <p className="text-xs leading-relaxed text-zinc-500">
        {avisoPrazoFreteCheckout(personalizado)}
      </p>
      <div className="flex flex-wrap items-end gap-3">
        <label className="block text-sm text-zinc-700">
          CEP de entrega
          <input
            type="text"
            inputMode="numeric"
            maxLength={9}
            value={cep.length > 5 ? `${cep.slice(0, 5)}-${cep.slice(5)}` : cep}
            onChange={(e) => setCep(e.target.value.replace(/\D/g, "").slice(0, 8))}
            className="mt-1 block w-40 rounded-lg border border-zinc-300 px-3 py-2"
            placeholder="00000-000"
          />
        </label>
        <button
          type="button"
          disabled={carregando}
          onClick={() => void cotar()}
          className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800 disabled:opacity-50"
        >
          {carregando ? "Calculando…" : "Calcular frete"}
        </button>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      {opcoes.length > 0 && (
        <ul className="divide-y divide-zinc-100 rounded-xl border border-zinc-100">
          {opcoes.map((op) => {
            const marcado = selecionada?.servicoId === op.servicoId;
            const precoExibir = freteGratis ? 0 : op.precoCentavos;
            const prazoTxt = textoPrazoFreteOpcao(op.prazoDias, personalizado);
            return (
              <li key={op.servicoId}>
                <label className="flex cursor-pointer items-center gap-3 px-3 py-3 hover:bg-zinc-50">
                  <input
                    type="radio"
                    name="frete"
                    checked={marcado}
                    onChange={() => onSelecionar(op, meta)}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-zinc-900">
                      {op.empresa ? `${op.empresa} — ${op.nome}` : op.nome}
                    </span>
                    {prazoTxt ? (
                      <span className="text-xs text-zinc-500">{prazoTxt}</span>
                    ) : null}
                  </span>
                  <span className="text-sm font-semibold tabular-nums text-zinc-900">
                    {precoExibir === 0 ? "Grátis" : formatarPreco(precoExibir)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
