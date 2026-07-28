"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { ProdutoImagem } from "@/components/loja/ProdutoImagem";
import { QuantityStepper } from "@/components/loja/QuantityStepper";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { listarModelosAtivos } from "@/features/catalogo/catalogoRuntimeService";
import { obterProdutoCatalogo } from "@/features/catalogo/catalogoProdutoService";
import { rotuloMaterial } from "@/features/catalogo/materiaisCapinha";
import { useCarrinho } from "@/features/loja/CarrinhoProvider";
import {
  calcularDisponivelVenda,
  listarEstoqueLojaMap,
  produtoControlaEstoque,
} from "@/features/admin/estoque/estoqueAdminService";
import { MARCA_LOJA_ID } from "@/features/multitenant/marcaLoja";
import { formatarPreco } from "@/features/loja/produtosMock";
import { precoRevendedorAPartirDe } from "@/features/revendedor/precoRevendedorFaixas";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { isFirebaseConfigured } from "@/lib/firebase";

type ModeloOpcao = { id: string; nome: string };

/**
 * Página do produto — seletor de modelo (estilo OBLI).
 * Personalizável → editor; pronta → carrinho.
 */
export function ProdutoPageClient() {
  const paths = useLojaPaths();
  const loja = useLojaEfetiva();
  const router = useRouter();
  const searchParams = useSearchParams();
  const produtoId = (searchParams.get("id") ?? "").trim();
  const { adicionarPronta } = useCarrinho();

  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [imagens, setImagens] = useState<string[]>([]);
  const [imagemAtiva, setImagemAtiva] = useState(0);
  const [precoCentavos, setPrecoCentavos] = useState(0);
  const [material, setMaterial] = useState<string | null>(null);
  const [destaque, setDestaque] = useState<string | null>(null);
  const [personalizavel, setPersonalizavel] = useState(false);
  const [modelos, setModelos] = useState<ModeloOpcao[]>([]);
  const [modeloId, setModeloId] = useState("");
  const [esgotado, setEsgotado] = useState(false);
  const [disponivelVenda, setDisponivelVenda] = useState<number | undefined>();
  const [controlaEstoque, setControlaEstoque] = useState(false);
  const [qty, setQty] = useState(1);
  const [adicionando, setAdicionando] = useState(false);
  const [marcaNome, setMarcaNome] = useState("");

  const isB2b = Boolean(loja?.isB2b);

  useEffect(() => {
    if (!produtoId || !isFirebaseConfigured()) {
      setCarregando(false);
      setErro(!produtoId ? "Produto não informado." : "Firebase não configurado.");
      return;
    }

    void (async () => {
      setCarregando(true);
      setErro(null);
      try {
        const [produto, modelosAtivos] = await Promise.all([
          obterProdutoCatalogo(produtoId),
          listarModelosAtivos(),
        ]);
        if (!produto) {
          setErro("Produto não encontrado ou inativo.");
          return;
        }

        const ids =
          produto.modelosCompativeis?.length
            ? produto.modelosCompativeis
            : [];
        if (ids.length === 0) {
          setErro("Este produto não tem modelos compatíveis cadastrados.");
          return;
        }

        const mapa = Object.fromEntries(
          modelosAtivos.map((m) => [m.id, m.nome]),
        );
        const opcoes = ids
          .map((id) => ({
            id,
            nome: mapa[id] ?? id,
          }))
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));

        const preco = isB2b
          ? precoRevendedorAPartirDe(produto)
          : produto.precoBaseCentavos;

        let disponivel: number | undefined;
        let esgota = false;
        const controla = produtoControlaEstoque(produto);
        if (controla && !produto.personalizavel) {
          const lojaEstoqueId = loja?.lojaId?.trim() || MARCA_LOJA_ID;
          const estoqueMap = await listarEstoqueLojaMap(lojaEstoqueId);
          disponivel = calcularDisponivelVenda(
            produto,
            estoqueMap[produto.id] ?? 0,
          );
          esgota = disponivel <= 0;
        }

        setNome(produto.nome);
        setDescricao(produto.descricao);
        setImagens(produto.imagens?.length ? produto.imagens : []);
        setImagemAtiva(0);
        setPrecoCentavos(preco);
        setMaterial(produto.material ?? null);
        setDestaque(produto.destaque ?? null);
        setPersonalizavel(Boolean(produto.personalizavel));
        setModelos(opcoes);
        setModeloId(opcoes[0]?.id ?? "");
        setControlaEstoque(controla && !produto.personalizavel);
        setDisponivelVenda(disponivel);
        setEsgotado(esgota);
        setMarcaNome("");
      } catch (e) {
        console.error(e);
        setErro(
          e instanceof Error
            ? e.message
            : "Não foi possível carregar o produto.",
        );
      } finally {
        setCarregando(false);
      }
    })();
  }, [produtoId, isB2b, loja?.lojaId]);

  const imagemPrincipal = imagens[imagemAtiva] ?? imagens[0];
  const modeloSelecionado = useMemo(
    () => modelos.find((m) => m.id === modeloId),
    [modelos, modeloId],
  );

  const maxEstoque =
    controlaEstoque && typeof disponivelVenda === "number"
      ? Math.max(1, disponivelVenda)
      : undefined;

  function handlePersonalizar() {
    if (!modeloId || !produtoId) return;
    router.push(paths.personalizar(modeloId, produtoId));
  }

  function handleComprar() {
    if (esgotado || !modeloId || !produtoId) return;
    setAdicionando(true);
    adicionarPronta({
      id: produtoId,
      produtoBaseId: produtoId,
      nome: nome,
      descricao,
      modeloId,
      marca: marcaNome || modeloSelecionado?.nome || "",
      precoCentavos,
      tipo: "pronta",
      categoria: "capinhas",
      material: material ?? undefined,
      destaque: destaque ?? undefined,
      imagemUrl: imagemPrincipal,
      controlaEstoque,
      disponivelVenda,
      esgotado,
      quantidadeInicial: Math.max(1, qty),
    });
    setTimeout(() => router.push(paths.carrinho), 350);
  }

  if (carregando) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <p className="pt-24 text-center text-zinc-600">Carregando produto…</p>
      </div>
    );
  }

  if (erro) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <div className="mx-auto max-w-lg px-4 py-16 text-center">
          <PageBackLink href={paths.personalizarHash} label="← Voltar" />
          <p className="mt-6 rounded-xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
            {erro}
          </p>
          <Link
            href={paths.home}
            className="mt-4 inline-block text-sm font-medium text-zinc-700 underline"
          >
            Ir para a loja
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
        <PageBackLink
          href={personalizavel ? paths.personalizarHash : paths.produtosHash}
          label="← Voltar"
        />

        <div className="mt-6 grid gap-8 lg:grid-cols-2 lg:gap-12">
          {/* Galeria */}
          <div className="flex gap-3 sm:gap-4">
            {imagens.length > 1 && (
              <ul className="flex w-14 shrink-0 flex-col gap-2 sm:w-16">
                {imagens.map((src, i) => (
                  <li key={`${src}-${i}`}>
                    <button
                      type="button"
                      onClick={() => setImagemAtiva(i)}
                      className={`relative aspect-square w-full overflow-hidden rounded-lg border bg-white ${
                        imagemAtiva === i
                          ? "border-zinc-900 ring-1 ring-zinc-900"
                          : "border-zinc-200 hover:border-zinc-400"
                      }`}
                      aria-label={`Foto ${i + 1}`}
                    >
                      <ProdutoImagem src={src} alt="" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <div className="relative aspect-square min-w-0 flex-1 overflow-hidden rounded-2xl border border-zinc-200 bg-white">
              {imagemPrincipal ? (
                <ProdutoImagem src={imagemPrincipal} alt={nome} />
              ) : (
                <div className="flex h-full items-center justify-center bg-zinc-100 text-sm text-zinc-500">
                  Sem imagem
                </div>
              )}
              {destaque && (
                <span className="absolute left-3 top-3 rounded-full bg-zinc-900 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-white">
                  {destaque}
                </span>
              )}
            </div>
          </div>

          {/* Infos + seletor */}
          <div className="flex flex-col">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
              {personalizavel ? "Capinha personalizável" : "Produto"}
            </p>
            <h1 className="mt-1 text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl">
              {nome}
            </h1>
            {material && (
              <p className="mt-1 text-sm text-zinc-500">
                {rotuloMaterial(material) ?? material}
              </p>
            )}
            <p className="mt-1 text-xs text-zinc-400">Cód: {produtoId}</p>

            <div className="mt-6">
              <p className="mb-2 text-sm font-semibold text-zinc-800">
                Selecione o modelo do celular:
              </p>
              <div className="flex flex-wrap gap-2">
                {modelos.map((m) => {
                  const ativo = m.id === modeloId;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setModeloId(m.id)}
                      className={`rounded-lg border px-3 py-2 text-sm transition ${
                        ativo
                          ? "border-zinc-900 bg-zinc-900 text-white"
                          : "border-zinc-300 bg-white text-zinc-800 hover:border-zinc-500"
                      }`}
                    >
                      {m.nome}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-6">
              <p className="text-2xl font-bold text-zinc-900">
                {isB2b ? "A partir de " : ""}
                {formatarPreco(precoCentavos)}
              </p>
              {descricao.trim() && (
                <p className="mt-3 text-sm leading-relaxed text-zinc-600">
                  {descricao}
                </p>
              )}
            </div>

            {controlaEstoque && !esgotado && (
              <p className="mt-3 text-xs text-zinc-500">
                {disponivelVenda ?? 0} em estoque
              </p>
            )}

            {!personalizavel && !esgotado && (
              <QuantityStepper
                className="mt-4"
                value={qty}
                max={maxEstoque}
                onChange={setQty}
              />
            )}

            {personalizavel ? (
              <button
                type="button"
                onClick={handlePersonalizar}
                disabled={!modeloId}
                className="mt-6 w-full rounded-xl bg-zinc-900 py-3.5 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 sm:max-w-sm"
              >
                Personalizar
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComprar}
                disabled={esgotado || adicionando || !modeloId}
                className="mt-6 w-full rounded-xl bg-zinc-900 py-3.5 text-base font-semibold text-white hover:bg-zinc-800 disabled:opacity-50 sm:max-w-sm"
              >
                {esgotado
                  ? "Esgotado"
                  : adicionando
                    ? "Indo ao carrinho…"
                    : "Comprar"}
              </button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
