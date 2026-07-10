"use client";

import type { EnderecoExpedicao } from "@/features/multitenant/types";
import { normalizarCep } from "@/features/revendedor/solicitacaoRevendedorUtils";

export type EnderecoExpedicaoForm = {
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string;
  bairro: string;
  cidade: string;
  uf: string;
  nomeRemetente: string;
};

export function enderecoExpedicaoVazio(): EnderecoExpedicaoForm {
  return {
    cep: "",
    logradouro: "",
    numero: "",
    complemento: "",
    bairro: "",
    cidade: "",
    uf: "",
    nomeRemetente: "",
  };
}

export function enderecoExpedicaoFromConfig(
  expedicao?: EnderecoExpedicao | null,
): EnderecoExpedicaoForm {
  if (!expedicao) return enderecoExpedicaoVazio();
  return {
    cep: expedicao.cep ?? "",
    logradouro: expedicao.logradouro ?? "",
    numero: expedicao.numero ?? "",
    complemento: expedicao.complemento ?? "",
    bairro: expedicao.bairro ?? "",
    cidade: expedicao.cidade ?? "",
    uf: expedicao.uf ?? "",
    nomeRemetente: expedicao.nomeRemetente ?? "",
  };
}

export function enderecoExpedicaoToConfig(
  form: EnderecoExpedicaoForm,
): EnderecoExpedicao | null {
  const cep = normalizarCep(form.cep);
  const logradouro = form.logradouro.trim();
  const numero = form.numero.trim();
  const bairro = form.bairro.trim();
  const cidade = form.cidade.trim();
  const uf = form.uf.trim().toUpperCase().slice(0, 2);

  if (!cep && !logradouro) return null;

  return {
    cep,
    logradouro,
    numero,
    complemento: form.complemento.trim() || null,
    bairro,
    cidade,
    uf,
    nomeRemetente: form.nomeRemetente.trim() || null,
  };
}

type Props = {
  value: EnderecoExpedicaoForm;
  onChange: (next: EnderecoExpedicaoForm) => void;
  titulo?: string;
  descricao?: string;
};

export function EnderecoExpedicaoFields({
  value,
  onChange,
  titulo = "Endereço de expedição",
  descricao,
}: Props) {
  function patch(partial: Partial<EnderecoExpedicaoForm>) {
    onChange({ ...value, ...partial });
  }

  return (
    <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
      <legend className="px-1 text-sm font-medium text-zinc-900">{titulo}</legend>
      {descricao ? (
        <p className="text-xs text-zinc-500">{descricao}</p>
      ) : null}

      <label className="block">
        <span className="text-xs text-zinc-600">Nome / razão social (remetente)</span>
        <input
          type="text"
          value={value.nomeRemetente}
          onChange={(e) => patch({ nomeRemetente: e.target.value })}
          className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block sm:col-span-1">
          <span className="text-xs text-zinc-600">CEP</span>
          <input
            type="text"
            inputMode="numeric"
            value={value.cep}
            onChange={(e) => patch({ cep: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            placeholder="00000-000"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs text-zinc-600">Logradouro</span>
          <input
            type="text"
            value={value.logradouro}
            onChange={(e) => patch({ logradouro: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs text-zinc-600">Número</span>
          <input
            type="text"
            value={value.numero}
            onChange={(e) => patch({ numero: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="text-xs text-zinc-600">Complemento</span>
          <input
            type="text"
            value={value.complemento}
            onChange={(e) => patch({ complemento: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="block">
          <span className="text-xs text-zinc-600">Bairro</span>
          <input
            type="text"
            value={value.bairro}
            onChange={(e) => patch({ bairro: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-600">Cidade</span>
          <input
            type="text"
            value={value.cidade}
            onChange={(e) => patch({ cidade: e.target.value })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
        <label className="block">
          <span className="text-xs text-zinc-600">UF</span>
          <input
            type="text"
            maxLength={2}
            value={value.uf}
            onChange={(e) => patch({ uf: e.target.value.toUpperCase() })}
            className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
        </label>
      </div>
    </fieldset>
  );
}
