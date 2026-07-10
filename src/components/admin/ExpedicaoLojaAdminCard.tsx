"use client";

import { useCallback, useEffect, useState } from "react";
import {
  atualizarRevendedorAdmin,
  obterRevendedorAdmin,
} from "@/features/admin/revendedores/revendedorAdminService";
import {
  EnderecoExpedicaoFields,
  enderecoExpedicaoFromConfig,
  enderecoExpedicaoToConfig,
  type EnderecoExpedicaoForm,
} from "@/components/admin/EnderecoExpedicaoFields";

type Props = {
  lojaId: string;
  titulo?: string;
  descricao?: string;
};

export function ExpedicaoLojaAdminCard({
  lojaId,
  titulo,
  descricao,
}: Props) {
  const [nomeLoja, setNomeLoja] = useState("");
  const [expedicao, setExpedicao] = useState<EnderecoExpedicaoForm>(
    enderecoExpedicaoFromConfig(),
  );
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const loja = await obterRevendedorAdmin(lojaId);
      if (!loja) {
        setErro("Loja não encontrada.");
        return;
      }
      setNomeLoja(loja.nome);
      setExpedicao(enderecoExpedicaoFromConfig(loja.config.expedicao));
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao carregar.");
    } finally {
      setCarregando(false);
    }
  }, [lojaId]);

  useEffect(() => {
    void carregar();
  }, [carregar]);

  async function handleSalvar() {
    setSalvando(true);
    setErro(null);
    setSucesso(false);
    try {
      const loja = await obterRevendedorAdmin(lojaId);
      if (!loja) throw new Error("Loja não encontrada.");

      await atualizarRevendedorAdmin(
        lojaId,
        {
          nome: loja.nome,
          config: {
            ...loja.config,
            expedicao: enderecoExpedicaoToConfig(expedicao),
          },
        },
        false,
      );
      setSucesso(true);
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <p className="text-sm text-zinc-500">Carregando endereço de expedição…</p>;
  }

  return (
    <div className="mb-6 space-y-3">
      {erro ? (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {erro}
        </p>
      ) : null}
      {sucesso ? (
        <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Endereço de expedição salvo.
        </p>
      ) : null}

      <EnderecoExpedicaoFields
        value={expedicao}
        onChange={setExpedicao}
        titulo={titulo ?? `Expedição — ${nomeLoja || lojaId}`}
        descricao={descricao}
      />

      <button
        type="button"
        disabled={salvando}
        onClick={() => void handleSalvar()}
        className="rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
      >
        {salvando ? "Salvando…" : "Salvar endereço de expedição"}
      </button>
    </div>
  );
}
