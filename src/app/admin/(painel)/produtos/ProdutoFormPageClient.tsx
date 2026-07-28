"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminShell } from "@/components/admin/AdminShell";
import {
  FaixasPrecoRevendedorFields,
  faixasDraftFromDocs,
  faixasDraftParaDocs,
} from "@/components/admin/FaixasPrecoRevendedorFields";
import { MATERIAIS_CAPINHA } from "@/features/catalogo/materiaisCapinha";
import {
  centavosParaReaisInput,
  reaisInputParaCentavos,
} from "@/features/admin/produtos/produtoFormUtils";
import {
  atualizarProdutoCentral,
  criarProdutoCentral,
  obterProdutoCentral,
} from "@/features/admin/produtos/produtoCentralService";
import { definirEstoqueLojaOficialMarca } from "@/features/admin/estoque/estoqueAdminService";
import { subirImagemProduto } from "@/features/admin/produtos/uploadImagemProduto";
import { MARCA_LOJA_ID } from "@/features/multitenant/marcaLoja";
import { listarMarcasAdmin } from "@/features/admin/catalogo/marcaAdminService";
import { listarModelosAdmin } from "@/features/admin/catalogo/modeloAdminService";
import { listarTiposAdmin } from "@/features/admin/catalogo/tipoAdminService";
import { SEED_CATALOGO } from "@/features/catalogo/types";
import { validarFaixasPrecoRevendedor } from "@/features/revendedor/precoRevendedorFaixas";
import type { FaixaPrecoRevendedor } from "@/features/multitenant/types";
import {
  normalizarPagamentoProduto,
  PAGAMENTO_PRODUTO_DEFAULT,
  type PagamentoProdutoConfig,
} from "@/features/pagamentos/pagamentoProduto";
import { PARCELAMENTO_MAXIMO } from "@/features/pagamentos/pagamentoConfig";

type Props = {
  produtoId?: string;
};

export function ProdutoFormPageClient({ produtoId }: Props) {
  const router = useRouter();
  const editando = Boolean(produtoId);

  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [precoReais, setPrecoReais] = useState("");
  const [precoRevendedorReais, setPrecoRevendedorReais] = useState("");
  const [pedidoMinimoRevendedorReais, setPedidoMinimoRevendedorReais] =
    useState("");
  const [faixasDraft, setFaixasDraft] = useState(() =>
    faixasDraftFromDocs(null),
  );
  const [imagens, setImagens] = useState<string[]>([]);
  const [ativo, setAtivo] = useState(true);
  const [tipoId, setTipoId] = useState<string>(SEED_CATALOGO.TIPO_CAPINHA);
  const [modoVenda, setModoVenda] = useState<"personalizada" | "pronta">("pronta");
  const [personalizavel, setPersonalizavel] = useState(false);
  const [material, setMaterial] = useState("");
  const [controlaEstoque, setControlaEstoque] = useState(true);
  const [estoqueCentral, setEstoqueCentral] = useState("0");
  const [marcaId, setMarcaId] = useState<string>("");
  const [modelosCompativeis, setModelosCompativeis] = useState<string[]>([]);
  const [pesoGramas, setPesoGramas] = useState("150");
  const [alturaCm, setAlturaCm] = useState("18");
  const [larguraCm, setLarguraCm] = useState("12");
  const [comprimentoCm, setComprimentoCm] = useState("4");
  const [pagamento, setPagamento] = useState<PagamentoProdutoConfig>({
    ...PAGAMENTO_PRODUTO_DEFAULT,
  });
  const [tipos, setTipos] = useState<{ id: string; nome: string; tipoPersonalizacao: string }[]>([]);
  const [marcas, setMarcas] = useState<{ id: string; nome: string }[]>([]);
  const [modelos, setModelos] = useState<{ id: string; nome: string; marcaId: string }[]>([]);
  const [carregando, setCarregando] = useState(editando);
  const [salvando, setSalvando] = useState(false);
  const [uploadando, setUploadando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [idRascunho, setIdRascunho] = useState<string | null>(produtoId ?? null);

  const tipoSelecionado = tipos.find((t) => t.id === tipoId);
  const ehCapinhaCelular =
    tipoSelecionado?.tipoPersonalizacao === "mascara_modelo" &&
    tipoId === SEED_CATALOGO.TIPO_CAPINHA;

  const podePersonalizar = ehCapinhaCelular;

  useEffect(() => {
    void Promise.all([
      listarTiposAdmin(),
      listarMarcasAdmin(),
      listarModelosAdmin(),
    ]).then(([t, m, mod]) => {
      setTipos(t);
      setMarcas(m);
      setModelos(mod);
    });
  }, []);

  useEffect(() => {
    if (!podePersonalizar && personalizavel) {
      setPersonalizavel(false);
    }
  }, [podePersonalizar, personalizavel]);

  useEffect(() => {
    if (personalizavel) {
      setModoVenda("personalizada");
    }
  }, [personalizavel]);

  useEffect(() => {
    if (!produtoId) return;

    void (async () => {
      setCarregando(true);
      try {
        const produto = await obterProdutoCentral(produtoId);
        if (!produto) {
          setErro("Produto não encontrado.");
          return;
        }
        setNome(produto.nome);
        setDescricao(produto.descricao);
        setPrecoReais(centavosParaReaisInput(produto.precoBaseCentavos));
        setPrecoRevendedorReais(
          produto.precoRevendedorCentavos != null &&
            produto.precoRevendedorCentavos > 0
            ? centavosParaReaisInput(produto.precoRevendedorCentavos)
            : "",
        );
        setPedidoMinimoRevendedorReais(
          produto.pedidoMinimoRevendedorCentavos != null &&
            produto.pedidoMinimoRevendedorCentavos > 0
            ? centavosParaReaisInput(produto.pedidoMinimoRevendedorCentavos)
            : "",
        );
        setFaixasDraft(
          faixasDraftFromDocs(
            produto.faixasPrecoRevendedor,
            produto.precoRevendedorCentavos,
          ),
        );
        setImagens(produto.imagens);
        setAtivo(produto.ativo);
        setTipoId(produto.tipoId);
        setModoVenda(produto.modoVenda);
        setPersonalizavel(Boolean(produto.personalizavel));
        setMaterial(produto.material ?? "");
        setControlaEstoque(Boolean(produto.controlaEstoque));
        setEstoqueCentral(String(produto.estoqueCentral ?? 0));
        setMarcaId(produto.marcaId ?? "");
        setModelosCompativeis(produto.modelosCompativeis ?? []);
        setPesoGramas(String(produto.pesoGramas ?? 150));
        setAlturaCm(String(produto.alturaCm ?? 18));
        setLarguraCm(String(produto.larguraCm ?? 12));
        setComprimentoCm(String(produto.comprimentoCm ?? 4));
        setPagamento(() => {
          const raw = produto.pagamento as
            | {
                maxParcelasCartao?: number | null;
                descontoPixPercentual?: number | null;
              }
            | null
            | undefined;
          const n = normalizarPagamentoProduto(produto.pagamento);
          return {
            ...n,
            // 0 no form = “usar padrão da loja” (null no Firestore)
            maxParcelasCartao:
              raw?.maxParcelasCartao != null && Number(raw.maxParcelasCartao) > 0
                ? n.maxParcelasCartao
                : 0,
            descontoPixPercentual:
              raw?.descontoPixPercentual != null &&
              Number(raw.descontoPixPercentual) > 0
                ? n.descontoPixPercentual
                : 0,
          };
        });
        setIdRascunho(produto.id);
      } catch (error) {
        setErro(
          error instanceof Error ? error.message : "Erro ao carregar produto.",
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [produtoId]);

  const payloadBase = useMemo(
    () => ({
      nome,
      descricao,
      imagens,
      ativo,
      tipoId,
      modoVenda: personalizavel ? ("personalizada" as const) : modoVenda,
      personalizavel: podePersonalizar ? personalizavel : false,
      material: material.trim() || null,
      controlaEstoque: personalizavel ? false : controlaEstoque,
      estoqueCentral: personalizavel ? 0 : Math.max(0, parseInt(estoqueCentral, 10) || 0),
      marcaId: marcaId || null,
      modelosCompativeis,
      pesoGramas: Math.max(1, parseInt(pesoGramas, 10) || 150),
      alturaCm: Math.max(1, parseInt(alturaCm, 10) || 18),
      larguraCm: Math.max(1, parseInt(larguraCm, 10) || 12),
      comprimentoCm: Math.max(1, parseInt(comprimentoCm, 10) || 4),
      pagamento,
    }),
    [
      nome,
      descricao,
      imagens,
      ativo,
      tipoId,
      modoVenda,
      personalizavel,
      material,
      podePersonalizar,
      controlaEstoque,
      estoqueCentral,
      marcaId,
      modelosCompativeis,
      pesoGramas,
      alturaCm,
      larguraCm,
      comprimentoCm,
      pagamento,
    ],
  );

  function resolverPayloadRevendedor():
    | {
        precoRevendedorCentavos: number;
        pedidoMinimoRevendedorCentavos: number;
        faixasPrecoRevendedor: FaixaPrecoRevendedor[];
      }
    | { erro: string } {
    const precoRevendedorCentavos = reaisInputParaCentavos(precoRevendedorReais);
    if (precoRevendedorCentavos === null || precoRevendedorCentavos <= 0) {
      return {
        erro: "Informe o preço de revendedor (obrigatório, ex.: 35,00).",
      };
    }
    const faixasPrecoRevendedor = faixasDraftParaDocs(faixasDraft);
    if (faixasPrecoRevendedor === null) {
      return {
        erro: "Preencha as faixas de preço do revendedor (quantidade e preço).",
      };
    }
    const erroFaixas = validarFaixasPrecoRevendedor(faixasPrecoRevendedor);
    if (erroFaixas) {
      return { erro: erroFaixas };
    }
    let pedidoMinimoRevendedorCentavos = 0;
    if (pedidoMinimoRevendedorReais.trim() !== "") {
      const min = reaisInputParaCentavos(pedidoMinimoRevendedorReais);
      if (min === null) {
        return {
          erro: "Pedido mínimo do revendedor inválido (ex.: 100,00).",
        };
      }
      pedidoMinimoRevendedorCentavos = min;
    }
    return {
      precoRevendedorCentavos,
      pedidoMinimoRevendedorCentavos,
      faixasPrecoRevendedor,
    };
  }

  function onPrecoRevendedorChange(value: string) {
    setFaixasDraft((prev) => {
      if (
        prev.length === 1 &&
        (prev[0].precoReais.trim() === "" ||
          prev[0].precoReais === precoRevendedorReais)
      ) {
        return [{ ...prev[0], precoReais: value }];
      }
      return prev;
    });
    setPrecoRevendedorReais(value);
  }

  async function handleUpload(files: FileList | null) {
    if (!files?.length) return;

    setUploadando(true);
    setErro(null);

    try {
      let produtoRef = idRascunho;
      if (!produtoRef) {
        const centavos = reaisInputParaCentavos(precoReais);
        if (!nome.trim() || centavos === null) {
          setErro("Preencha nome e preço antes de enviar imagens.");
          return;
        }
        const revendedor = resolverPayloadRevendedor();
        if ("erro" in revendedor) {
          setErro(revendedor.erro);
          return;
        }
        produtoRef = await criarProdutoCentral({
          ...payloadBase,
          precoBaseCentavos: centavos,
          ...revendedor,
        });
        setIdRascunho(produtoRef);
      }

      const novasUrls: string[] = [];
      for (const file of Array.from(files)) {
        novasUrls.push(await subirImagemProduto(produtoRef, file));
      }
      setImagens((prev) => [...prev, ...novasUrls]);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao enviar imagem.",
      );
    } finally {
      setUploadando(false);
    }
  }

  function removerImagem(url: string) {
    setImagens((prev) => prev.filter((item) => item !== url));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setErro(null);

    const precoBaseCentavos = reaisInputParaCentavos(precoReais);
    if (!nome.trim()) {
      setErro("Informe o nome do produto.");
      return;
    }
    if (precoBaseCentavos === null) {
      setErro("Informe um preço válido (ex.: 49,90).");
      return;
    }
    const revendedor = resolverPayloadRevendedor();
    if ("erro" in revendedor) {
      setErro(revendedor.erro);
      return;
    }
    if (
      !pagamento.aceitaPix &&
      !pagamento.aceitaBoleto &&
      !pagamento.aceitaCartao
    ) {
      setErro("Selecione ao menos uma forma de pagamento (PIX, boleto ou cartão).");
      return;
    }
    if (personalizavel && modelosCompativeis.length === 0) {
      setErro(
        "Produto personalizável precisa de pelo menos um modelo de capinha cadastrado em Admin → Modelos.",
      );
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        ...payloadBase,
        precoBaseCentavos,
        ...revendedor,
      };

      let produtoId = idRascunho;
      if (idRascunho) {
        await atualizarProdutoCentral(idRascunho, payload);
      } else {
        produtoId = await criarProdutoCentral(payload);
      }

      // Mantém estoque da loja oficial sincronizado com o número do formulário
      // (o site usa min(central, lojas/zenpro/estoque)).
      if (
        produtoId &&
        !payload.personalizavel &&
        payload.controlaEstoque
      ) {
        await definirEstoqueLojaOficialMarca(
          produtoId,
          payload.estoqueCentral,
          MARCA_LOJA_ID,
        );
      }

      router.push("/admin/produtos");
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Erro ao salvar.");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return (
      <AdminShell titulo={editando ? "Editar produto" : "Novo produto"}>
        <p className="text-sm text-zinc-500">Carregando...</p>
      </AdminShell>
    );
  }

  return (
    <AdminShell
      titulo={editando ? "Editar produto" : "Novo produto"}
      subtitulo="Catálogo central — visível na loja quando ativo"
    >
      <form
        onSubmit={(e) => void handleSubmit(e)}
        className="mx-auto max-w-xl space-y-5 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm"
      >
        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700">Nome</span>
          <input
            type="text"
            required
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </label>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700">Descrição</span>
          <textarea
            rows={4}
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-900"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Tipo de produto</span>
            <select
              value={tipoId}
              onChange={(e) => setTipoId(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
            >
              {tipos.map((t) => (
                <option key={t.id} value={t.id}>{t.nome}</option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">Modo de venda</span>
            <select
              value={modoVenda}
              disabled={personalizavel}
              onChange={(e) => setModoVenda(e.target.value as "personalizada" | "pronta")}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 disabled:bg-zinc-100"
            >
              <option value="pronta">Pronta entrega</option>
              <option value="personalizada">Sob encomenda</option>
            </select>
          </label>
        </div>

        <div className="space-y-3 rounded-xl border border-violet-200 bg-violet-50 p-4">
          <label className="flex items-start gap-3">
            <input
              type="checkbox"
              checked={personalizavel}
              disabled={!podePersonalizar}
              onChange={(e) => setPersonalizavel(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-zinc-300"
            />
            <span>
              <span className="text-sm font-medium text-zinc-900">
                Produto personalizável (cliente envia foto)
              </span>
              <span className="mt-1 block text-xs text-zinc-600">
                {podePersonalizar
                  ? "Aparece na seção “Personalize com sua foto” do site. Por enquanto disponível só para capinhas de celular."
                  : "Personalização com foto está disponível apenas para o tipo Capinha de celular."}
              </span>
            </span>
          </label>

          {personalizavel && (
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-xs text-amber-950">
              <strong>Importante:</strong> cadastre em{" "}
              <Link href="/admin/modelos" className="font-semibold underline">
                Admin → Modelos
              </Link>{" "}
              a capinha de cada aparelho (máscara + moldura PNG). Essas imagens
              são o mock usado no editor quando o cliente personaliza a foto.
              Depois, selecione os modelos compatíveis abaixo.
            </div>
          )}

          {ehCapinhaCelular && (
            <label className="block space-y-1.5">
              <span className="text-sm font-medium text-zinc-700">
                Material / acabamento
              </span>
              <select
                value={material}
                onChange={(e) => setMaterial(e.target.value)}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
              >
                <option value="">— Não informado —</option>
                {MATERIAIS_CAPINHA.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.rotulo}
                  </option>
                ))}
              </select>
              <span className="text-xs text-zinc-500">
                Variantes do mesmo aparelho (couro, silicone, acrílico…) têm
                preços diferentes e aparecem como produtos separados na vitrine.
              </span>
            </label>
          )}
        </div>

        {ehCapinhaCelular && (
          <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
            <legend className="px-1 text-sm font-medium text-zinc-700">
              Capinha — marca e modelos compatíveis
            </legend>
            <label className="block space-y-1.5">
              <span className="text-sm text-zinc-600">Marca</span>
              <select
                value={marcaId}
                onChange={(e) => {
                  setMarcaId(e.target.value);
                  setModelosCompativeis([]);
                }}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
              >
                <option value="">—</option>
                {marcas.map((m) => (
                  <option key={m.id} value={m.id}>{m.nome}</option>
                ))}
              </select>
            </label>
            <div className="space-y-2">
              <span className="text-sm text-zinc-600">Modelos compatíveis</span>
              <ul className="max-h-40 space-y-1 overflow-y-auto rounded-lg border border-zinc-200 p-2">
                {modelos
                  .filter((m) => !marcaId || m.marcaId === marcaId)
                  .map((m) => (
                    <li key={m.id}>
                      <label className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={modelosCompativeis.includes(m.id)}
                          onChange={(e) => {
                            setModelosCompativeis((prev) =>
                              e.target.checked
                                ? [...prev, m.id]
                                : prev.filter((id) => id !== m.id),
                            );
                          }}
                        />
                        {m.nome}
                      </label>
                    </li>
                  ))}
              </ul>
              {modelos.filter((m) => !marcaId || m.marcaId === marcaId).length === 0 && (
                <p className="text-xs text-zinc-500">
                  Nenhum modelo cadastrado.{" "}
                  <Link href="/admin/modelos/novo" className="underline">
                    Cadastrar modelo
                  </Link>
                </p>
              )}
            </div>
          </fieldset>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Preço loja / cliente (R$)
            </span>
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="49,90"
              value={precoReais}
              onChange={(e) => setPrecoReais(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <p className="text-xs text-zinc-500">
              Valor cobrado do consumidor final na loja.
            </p>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-zinc-700">
              Preço revendedor (R$) *
            </span>
            <input
              type="text"
              inputMode="decimal"
              required
              placeholder="35,00"
              value={precoRevendedorReais}
              onChange={(e) => onPrecoRevendedorChange(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-900"
            />
            <p className="text-xs text-zinc-500">
              Cobrado quando o revendedor pede reposição (obrigatório).
            </p>
          </label>
        </div>

        <label className="block space-y-1.5">
          <span className="text-sm font-medium text-zinc-700">
            Pedido mínimo revendedor (R$)
          </span>
          <input
            type="text"
            inputMode="decimal"
            placeholder="0,00"
            value={pedidoMinimoRevendedorReais}
            onChange={(e) => setPedidoMinimoRevendedorReais(e.target.value)}
            className="w-full rounded-lg border border-zinc-300 px-3 py-2.5 outline-none focus:ring-2 focus:ring-zinc-900"
          />
          <p className="text-xs text-zinc-500">
            Valor mínimo da linha no pedido B2B (qty × preço). Vazio = sem
            mínimo.
          </p>
        </label>

        <FaixasPrecoRevendedorFields
          faixas={faixasDraft}
          onChange={setFaixasDraft}
        />

        <fieldset className="space-y-3 rounded-xl border border-zinc-200 bg-white p-4">
          <legend className="px-1 text-sm font-semibold text-zinc-900">
            Pagamento online
          </legend>
          <p className="text-xs text-zinc-600">
            Padrão: PIX, boleto e cartão em até {PARCELAMENTO_MAXIMO}x. Desmarque
            o que não deve aparecer no checkout deste produto.
          </p>
          <div className="flex flex-wrap gap-4">
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={pagamento.aceitaPix}
                onChange={(e) =>
                  setPagamento((p) => ({ ...p, aceitaPix: e.target.checked }))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              PIX
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={pagamento.aceitaBoleto}
                onChange={(e) =>
                  setPagamento((p) => ({ ...p, aceitaBoleto: e.target.checked }))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Boleto
            </label>
            <label className="flex items-center gap-2 text-sm text-zinc-800">
              <input
                type="checkbox"
                checked={pagamento.aceitaCartao}
                onChange={(e) =>
                  setPagamento((p) => ({ ...p, aceitaCartao: e.target.checked }))
                }
                className="h-4 w-4 rounded border-zinc-300"
              />
              Cartão de crédito
            </label>
          </div>
          {pagamento.aceitaPix && (
            <label className="block max-w-xs text-sm text-zinc-700">
              Desconto no PIX (%)
              <input
                type="number"
                min={0}
                max={100}
                step={0.5}
                value={pagamento.descontoPixPercentual}
                onChange={(e) =>
                  setPagamento((p) => ({
                    ...p,
                    descontoPixPercentual: Math.min(
                      100,
                      Math.max(0, Number(e.target.value) || 0),
                    ),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              />
              <span className="mt-1 block text-xs text-zinc-500">
                Deixe 0 para usar o desconto padrão da loja (Admin → Loja).
              </span>
            </label>
          )}
          {pagamento.aceitaCartao && (
            <label className="block max-w-xs text-sm text-zinc-700">
              Parcelas máximas no cartão
              <select
                value={pagamento.maxParcelasCartao}
                onChange={(e) =>
                  setPagamento((p) => ({
                    ...p,
                    maxParcelasCartao: Math.max(
                      0,
                      Math.min(PARCELAMENTO_MAXIMO, Number(e.target.value) || 0),
                    ),
                  }))
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2"
              >
                <option value={0}>Padrão da loja (Admin → Loja)</option>
                {Array.from({ length: PARCELAMENTO_MAXIMO }, (_, i) => i + 1).map(
                  (n) => (
                    <option key={n} value={n}>
                      Até {n}x
                    </option>
                  ),
                )}
              </select>
              <span className="mt-1 block text-xs text-zinc-500">
                “Padrão da loja” herda o teto configurado no admin.
              </span>
            </label>
          )}
          {!pagamento.aceitaPix &&
            !pagamento.aceitaBoleto &&
            !pagamento.aceitaCartao && (
              <p className="text-xs text-amber-800">
                Selecione ao menos uma forma de pagamento.
              </p>
            )}
        </fieldset>

        <fieldset className="space-y-3 rounded-xl border border-teal-200 bg-teal-50/40 p-4">
          <legend className="px-1 text-sm font-semibold text-teal-950">
            Frete (Melhor Envio)
          </legend>
          <p className="text-xs text-teal-900/80">
            Peso e dimensões da embalagem — usados na cotação de frete no
            checkout.
          </p>
          <div className="grid gap-3 sm:grid-cols-4">
            <label className="block text-xs font-medium text-zinc-700">
              Peso (g)
              <input
                type="number"
                min={1}
                required
                value={pesoGramas}
                onChange={(e) => setPesoGramas(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              Altura (cm)
              <input
                type="number"
                min={1}
                required
                value={alturaCm}
                onChange={(e) => setAlturaCm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              Largura (cm)
              <input
                type="number"
                min={1}
                required
                value={larguraCm}
                onChange={(e) => setLarguraCm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs font-medium text-zinc-700">
              Comprimento (cm)
              <input
                type="number"
                min={1}
                required
                value={comprimentoCm}
                onChange={(e) => setComprimentoCm(e.target.value)}
                className="mt-1 w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm"
              />
            </label>
          </div>
        </fieldset>

        {!personalizavel && (
          <fieldset className="space-y-3 rounded-xl border border-zinc-200 p-4">
            <legend className="px-1 text-sm font-medium text-zinc-700">Estoque (marca)</legend>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={controlaEstoque}
                onChange={(e) => setControlaEstoque(e.target.checked)}
                className="h-4 w-4 rounded border-zinc-300"
              />
              <span className="text-sm text-zinc-700">Controlar estoque deste produto</span>
            </label>
            {controlaEstoque && (
              <label className="block space-y-1.5">
                <span className="text-sm text-zinc-600">
                  Quantidade disponível no site
                </span>
                <input
                  type="number"
                  min={0}
                  value={estoqueCentral}
                  onChange={(e) => setEstoqueCentral(e.target.value)}
                  className="w-full rounded-lg border border-zinc-300 px-3 py-2.5"
                />
                <p className="text-xs text-zinc-500">
                  Ao salvar, sincroniza o estoque da loja oficial. Também dá
                  para ajustar em <strong>Admin → Estoque</strong>.
                </p>
              </label>
            )}
          </fieldset>
        )}

        <fieldset className="space-y-3">
          <legend className="text-sm font-medium text-zinc-700">Imagens</legend>
          {imagens.length > 0 && (
            <ul className="flex flex-wrap gap-3">
              {imagens.map((url) => (
                <li key={url} className="relative">
                  <div className="relative h-20 w-20 overflow-hidden rounded-lg border border-zinc-200">
                    <Image
                      src={url}
                      alt=""
                      fill
                      className="object-cover"
                      unoptimized
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removerImagem(url)}
                    className="mt-1 w-full text-xs text-red-600 hover:underline"
                  >
                    Remover
                  </button>
                </li>
              ))}
            </ul>
          )}
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-zinc-300 bg-zinc-50 px-4 py-6 text-sm text-zinc-600 hover:bg-zinc-100">
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              disabled={uploadando}
              onChange={(e) => void handleUpload(e.target.files)}
            />
            {uploadando
              ? "Enviando imagem..."
              : "Clique para enviar imagens (JPEG/PNG)"}
          </label>
        </fieldset>

        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <span className="text-sm text-zinc-700">Produto ativo na loja</span>
        </label>

        {erro && <p className="text-sm text-red-600">{erro}</p>}

        <div className="flex flex-wrap gap-3 pt-2">
          <button
            type="submit"
            disabled={salvando || uploadando}
            className="rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          >
            {salvando ? "Salvando..." : "Salvar produto"}
          </button>
          <Link
            href="/admin/produtos"
            className="rounded-xl border border-zinc-300 px-5 py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
          >
            Cancelar
          </Link>
        </div>
      </form>
    </AdminShell>
  );
}
