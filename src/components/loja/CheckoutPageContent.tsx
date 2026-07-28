"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { CartItemPreview } from "@/components/loja/CartItemPreview";
import { VerPreviewPersonalizacaoButton } from "@/components/personalizacao/VerPreviewPersonalizacaoButton";
import { CasePreview } from "@/features/personalizacao/CasePreviewLazy";
import { PageBackLink } from "@/components/loja/PageBackLink";
import { StoreHeader } from "@/components/loja/StoreHeader";
import { useAuth } from "@/features/auth/AuthProvider";
import { useCarrinho } from "@/features/loja/CarrinhoProvider";
import { validarEstoqueVenda } from "@/features/admin/estoque/estoqueAdminService";
import { criarPedidoLoja } from "@/features/loja/criarPedidoLoja";
import {
  criarCheckoutMercadoPago,
  urlCheckoutMercadoPago,
} from "@/features/pagamentos/mercadoPagoClient";
import { SeletorFormaPagamentoOnline } from "@/components/loja/SeletorFormaPagamentoOnline";
import {
  pagamentoMockAtivo,
  siteUrlBase,
} from "@/features/pagamentos/pagamentoConfig";
import type { PedidoLojaFormaPagamentoOnline } from "@/features/multitenant/types";
import { useLojaEfetiva } from "@/features/loja/useLojaEfetiva";
import { useLojaPaths } from "@/features/loja/useLojaPaths";
import { formatarPreco } from "@/features/loja/produtosMock";
import { MARCA_LOJA_EFETIVA } from "@/features/multitenant/marcaLoja";
import {
  formatarCep,
  formatarCpf,
  formatarEnderecoCompleto,
  formatarTelefone,
} from "@/features/usuario/perfilUtils";
import { usePerfilUsuario } from "@/features/usuario/usePerfilUsuario";
import { isFirebaseConfigured } from "@/lib/firebase";
import { useBeneficiosCheckoutB2b } from "@/features/revendedor/useBeneficiosCheckoutB2b";
import { rotuloNivelRevendedor } from "@/features/admin/revendedores/niveisRevendedorService";
import { FreteCheckoutSection } from "@/components/loja/FreteCheckoutSection";
import type { OpcaoFreteMelhorEnvio } from "@/features/envios/melhorEnvioClient";
import {
  avisoPrazoFreteCheckout,
  textoPrazoFreteOpcao,
} from "@/features/envios/prazoFreteCopy";
import { obterProdutoCentral } from "@/features/admin/produtos/produtoCentralService";
import {
  descontoPixCentavos,
  formaPadraoPermitida,
  formasPermitidasDoPagamento,
  intersecaoPagamentoProdutos,
  normalizarPagamentoProduto,
  PAGAMENTO_PRODUTO_DEFAULT,
  type PagamentoProdutoConfig,
} from "@/features/pagamentos/pagamentoProduto";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseDb } from "@/lib/firebase";
import { COLECOES } from "@/features/multitenant/types";

export function CheckoutPageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const paths = useLojaPaths();
  // Revendedor (/[slug]) quando houver; senão a loja oficial do dono (raiz).
  const loja = useLojaEfetiva() ?? MARCA_LOJA_EFETIVA;
  const { user, carregando: authCarregando } = useAuth();
  const { perfil, carregando: perfilCarregando, completo } = usePerfilUsuario(user);
  const { itens, totalCentavos, limpar } = useCarrinho();
  const beneficios = useBeneficiosCheckoutB2b(totalCentavos);
  const totalProdutos = beneficios?.totalComDesconto ?? totalCentavos;
  const [freteOpcao, setFreteOpcao] = useState<OpcaoFreteMelhorEnvio | null>(
    null,
  );
  const [freteMeta, setFreteMeta] = useState({
    cepOrigem: "",
    cepDestino: "",
    origemLojaId: "",
  });
  const freteCentavos =
    beneficios?.freteGratis ? 0 : freteOpcao?.precoCentavos ?? 0;
  const [pagando, setPagando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [pedidoId, setPedidoId] = useState<string | null>(null);
  const [modalConfirmar, setModalConfirmar] = useState(false);
  const [formaPagamento, setFormaPagamento] =
    useState<PedidoLojaFormaPagamentoOnline>("pix");
  const [parcelas, setParcelas] = useState(1);
  const [pagamentoCfg, setPagamentoCfg] = useState<PagamentoProdutoConfig>({
    ...PAGAMENTO_PRODUTO_DEFAULT,
  });
  const descontoPix =
    formaPagamento === "pix"
      ? descontoPixCentavos(
          totalProdutos,
          pagamentoCfg.descontoPixPercentual,
        )
      : 0;
  const totalPago = Math.max(0, totalProdutos - descontoPix + freteCentavos);
  const mockPagamento = pagamentoMockAtivo();
  const formasPagamento = formasPermitidasDoPagamento(pagamentoCfg);

  const temPersonalizada = itens.some((i) => i.tipo === "personalizada");
  const prazoFreteResumo = freteOpcao
    ? textoPrazoFreteOpcao(freteOpcao.prazoDias, temPersonalizada)
    : null;
  const checkoutPath = loja.basePath ? `${loja.basePath}/checkout` : "/checkout";

  useEffect(() => {
    // Só redireciona para o subcaminho quando é revendedor (basePath preenchido).
    if (pathname !== "/checkout" || !loja.basePath) return;
    router.replace(`${loja.basePath}/checkout`);
  }, [pathname, loja.basePath, router]);

  useEffect(() => {
    if (authCarregando || pedidoId) return;
    if (!user) {
      router.replace(paths.loginRedirect(checkoutPath));
    }
  }, [authCarregando, user, router, pedidoId, paths, checkoutPath]);

  const produtoIdsKey = itens
    .map((i) => i.produtoId)
    .filter(Boolean)
    .sort()
    .join(",");

  useEffect(() => {
    const ids = [...new Set(produtoIdsKey.split(",").filter(Boolean))];
    if (ids.length === 0) {
      setPagamentoCfg({ ...PAGAMENTO_PRODUTO_DEFAULT });
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        let lojaPadrao: {
          maxParcelasCartao?: number;
          descontoPixPercentual?: number;
        } | null = null;
        if (isFirebaseConfigured()) {
          const snap = await getDoc(
            doc(getFirebaseDb(), COLECOES.LOJAS, loja.lojaId),
          );
          const cfg = snap.data()?.config as
            | { pagamentoPadrao?: typeof lojaPadrao }
            | undefined;
          lojaPadrao = cfg?.pagamentoPadrao ?? null;
        }
        const produtos = await Promise.all(
          ids.map((id) => obterProdutoCentral(id)),
        );
        if (cancelled) return;
        const configs = produtos.map((p) =>
          normalizarPagamentoProduto(p?.pagamento, lojaPadrao),
        );
        const cfg = intersecaoPagamentoProdutos(configs);
        setPagamentoCfg(cfg);
        const formas = formasPermitidasDoPagamento(cfg);
        setFormaPagamento((prev) =>
          formas.includes(prev) ? prev : formaPadraoPermitida(formas),
        );
        setParcelas((p) => Math.min(p, cfg.maxParcelasCartao));
      } catch (e) {
        console.error(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [produtoIdsKey, loja.lojaId]);

  if (authCarregando || perfilCarregando) {
    return (
      <div className="min-h-screen bg-zinc-50 pt-20 text-center text-zinc-600">
        Carregando...
      </div>
    );
  }

  if (!user && !pedidoId) {
    return null;
  }

  if (itens.length === 0 && !pedidoId) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <PageBackLink href={paths.carrinho} />
          <p className="mt-6 text-zinc-600">Nenhum item para finalizar.</p>
        </main>
      </div>
    );
  }

  async function executarPagamento() {
    if (!isFirebaseConfigured() || !user || !perfil) {
      setErro("Faça login para continuar.");
      return;
    }

    if (!completo) {
      router.push(`/conta?redirect=${encodeURIComponent(checkoutPath)}`);
      return;
    }

    if (!freteOpcao) {
      setErro("Calcule e selecione o frete antes de pagar.");
      return;
    }

    if (!formasPagamento.includes(formaPagamento)) {
      setErro("Selecione uma forma de pagamento válida para os itens do carrinho.");
      return;
    }

    setErro(null);
    setPagando(true);

    try {
      await Promise.all(
        itens
          .filter((item) => item.tipo === "pronta")
          .map((item) =>
            validarEstoqueVenda(
              loja.lojaId,
              item.produtoId,
              Math.max(1, item.quantidade || 1),
            ),
          ),
      );

      const id = await criarPedidoLoja({
        lojaId: loja.lojaId,
        lojaNome: loja.nome,
        itens,
        totalCentavos: totalPago,
        totalProdutosCentavos: totalProdutos,
        user,
        perfil,
        simularPagamentoMock: mockPagamento,
        canal: loja.isB2b ? "revendedor_b2b" : "loja",
        beneficioNivel: beneficios
          ? {
              nivel: beneficios.metricas.nivel,
              descontoPercentual: beneficios.descontoPercentual,
              descontoCentavos: beneficios.descontoCentavos,
              subtotalCentavos: totalCentavos,
              freteGratis: beneficios.freteGratis,
            }
          : undefined,
        frete: {
          servicoId: freteOpcao.servicoId,
          nome: freteOpcao.nome,
          empresa: freteOpcao.empresa ?? "",
          companyId: freteOpcao.companyId ?? null,
          precoCentavos: freteCentavos,
          prazoDias: freteOpcao.prazoDias ?? null,
          cepOrigem: freteMeta.cepOrigem || "",
          cepDestino: freteMeta.cepDestino || "",
          origemLojaId: freteMeta.origemLojaId || null,
        },
        formaOnline: formaPagamento,
      });

      if (mockPagamento) {
        setPedidoId(id);
        limpar();
        return;
      }

      const returnBase = loja.basePath
        ? `${siteUrlBase()}${loja.basePath}`
        : siteUrlBase();

      const checkout = await criarCheckoutMercadoPago({
        tipo: "loja",
        lojaId: loja.lojaId,
        pedidoId: id,
        formaPagamento,
        parcelas: formaPagamento === "cartao" ? parcelas : 1,
        maxParcelas: pagamentoCfg.maxParcelasCartao,
        returnBasePath: returnBase,
      });

      limpar();
      window.location.href = urlCheckoutMercadoPago(checkout);
    } catch (error) {
      console.error(error);
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível criar o pedido. Tente novamente.",
      );
    } finally {
      setPagando(false);
      setModalConfirmar(false);
    }
  }

  function handlePagar() {
    if (temPersonalizada) {
      setModalConfirmar(true);
      return;
    }
    void executarPagamento();
  }

  if (pedidoId) {
    return (
      <div className="min-h-screen bg-zinc-50">
        <StoreHeader />
        <main className="mx-auto max-w-lg px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-zinc-900">Pedido registrado</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Loja: <strong>{loja.nome}</strong>
          </p>
          <p className="mt-2 text-zinc-600">
            Nº{" "}
            <code className="rounded bg-zinc-100 px-2 py-0.5 text-sm">{pedidoId}</code>
          </p>
          <p className="mt-1 text-sm text-zinc-500">
            {mockPagamento
              ? "Pagamento mock aprovado — pedido visível no admin."
              : "Você será redirecionado ao Mercado Pago para concluir."}
          </p>
          <Link
            href={paths.home}
            className="mt-6 inline-block rounded-xl bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Voltar à loja
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <StoreHeader />
      <main className="pb-safe mx-auto max-w-3xl px-4 pb-12 pt-6 sm:px-6 sm:pb-16 sm:pt-8">
        <PageBackLink href={paths.carrinho} label="← Voltar ao carrinho" />
        <h1 className="mt-4 text-2xl font-bold text-zinc-900 sm:text-3xl">
          Checkout
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Comprando em <strong>{loja.nome}</strong>
        </p>

        {!completo && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Complete nome, CPF e endereço em{" "}
            <Link
              href={`/conta?redirect=${encodeURIComponent(checkoutPath)}`}
              className="font-semibold underline"
            >
              Minha conta
            </Link>{" "}
            antes de pagar.
          </div>
        )}

        <section className="mt-8 space-y-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Resumo do pedido
          </h2>
          <ul className="divide-y divide-zinc-200 rounded-2xl border border-zinc-200 bg-white shadow-sm">
            {itens.map((item) => (
              <li key={item.id} className="flex items-center gap-4 p-4">
                <CartItemPreview item={item} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-zinc-900">{item.nomeProduto}</p>
                  <p className="text-sm text-zinc-500">
                    {item.rotuloModelo} ·{" "}
                    {item.tipo === "personalizada" ? "Personalizada" : "Produto"}
                    {(item.quantidade || 1) > 1
                      ? ` · Qtd ${item.quantidade}`
                      : ""}
                  </p>
                  <VerPreviewPersonalizacaoButton item={item} />
                </div>
                <p className="shrink-0 text-right font-semibold tabular-nums text-zinc-900">
                  {formatarPreco(
                    item.precoCentavos * Math.max(1, item.quantidade || 1),
                  )}
                  {(item.quantidade || 1) > 1 && (
                    <span className="mt-0.5 block text-xs font-normal text-zinc-500">
                      {formatarPreco(item.precoCentavos)} × {item.quantidade}
                    </span>
                  )}
                </p>
              </li>
            ))}
          </ul>
          <p className="text-right text-lg font-semibold text-zinc-900">
            {beneficios && beneficios.descontoCentavos > 0 && (
              <span className="mb-1 block text-sm font-normal text-emerald-700">
                Desconto {rotuloNivelRevendedor(beneficios.metricas.nivel)} (
                {beneficios.descontoPercentual}%): −
                {formatarPreco(beneficios.descontoCentavos)}
              </span>
            )}
            {descontoPix > 0 && (
              <span className="mb-1 block text-sm font-normal text-emerald-700">
                Desconto PIX ({pagamentoCfg.descontoPixPercentual}%): −
                {formatarPreco(descontoPix)}
              </span>
            )}
            {freteOpcao && (
              <>
                <span className="mb-1 block text-sm font-normal text-zinc-600">
                  Frete ({freteOpcao.empresa || freteOpcao.nome}):{" "}
                  {freteCentavos === 0
                    ? "Grátis"
                    : formatarPreco(freteCentavos)}
                  {prazoFreteResumo ? ` · ${prazoFreteResumo}` : ""}
                </span>
                <span className="mb-1 block text-xs font-normal text-zinc-500">
                  {avisoPrazoFreteCheckout(temPersonalizada)}
                </span>
              </>
            )}
            {beneficios?.freteGratis && (
              <span className="mb-1 block text-sm font-normal text-emerald-700">
                Frete grátis (benefício do nível)
              </span>
            )}
            Total:{" "}
            <span className="tabular-nums">{formatarPreco(totalPago)}</span>
            {beneficios && beneficios.descontoCentavos > 0 && (
              <span className="ml-2 text-sm font-normal text-zinc-400 line-through">
                {formatarPreco(totalCentavos + (freteOpcao?.precoCentavos ?? 0))}
              </span>
            )}
          </p>
        </section>

        <FreteCheckoutSection
          lojaId={loja.lojaId}
          cepPadrao={perfil?.cep ?? ""}
          freteGratis={Boolean(beneficios?.freteGratis)}
          itens={itens.map((i) => ({
            produtoId: i.produtoId,
            quantidade: i.quantidade || 1,
            personalizacaoId: i.personalizacaoId,
            precoCentavos: i.precoCentavos,
          }))}
          selecionada={freteOpcao}
          onSelecionar={(opcao, meta) => {
            setFreteOpcao(opcao);
            setFreteMeta(meta);
          }}
        />

        <section className="mt-8 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Pagamento
          </h2>
          {mockPagamento ? (
            <p className="text-sm text-zinc-600">
              Modo desenvolvimento — pagamento simulado (mock).
            </p>
          ) : (
            <SeletorFormaPagamentoOnline
              formaPagamento={formaPagamento}
              onFormaChange={setFormaPagamento}
              parcelas={parcelas}
              onParcelasChange={setParcelas}
              totalCentavos={totalPago}
              formasPermitidas={formasPagamento}
              maxParcelas={pagamentoCfg.maxParcelasCartao}
            />
          )}
        </section>

        <section className="mt-10 space-y-3 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Dados de entrega
            </h2>
            <Link
              href={`/conta?redirect=${encodeURIComponent(checkoutPath)}`}
              className="text-sm font-medium text-zinc-700 underline"
            >
              Editar
            </Link>
          </div>

          {completo && perfil ? (
            <dl className="space-y-2 text-sm">
              <div>
                <dt className="text-zinc-500">Nome</dt>
                <dd className="font-medium text-zinc-900">{perfil.nomeCompleto}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">CPF</dt>
                <dd className="font-medium text-zinc-900">
                  {formatarCpf(perfil.cpf)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Telefone</dt>
                <dd className="font-medium text-zinc-900">
                  {formatarTelefone(perfil.telefone)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">E-mail</dt>
                <dd className="font-medium text-zinc-900">{perfil.email}</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Endereço</dt>
                <dd className="font-medium text-zinc-900">
                  {formatarEnderecoCompleto(perfil)}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">CEP</dt>
                <dd className="font-medium text-zinc-900">
                  {formatarCep(perfil.cep)}
                </dd>
              </div>
            </dl>
          ) : (
            <p className="text-sm text-zinc-600">
              Nenhum endereço cadastrado ainda.
            </p>
          )}
        </section>

        {erro && <p className="mt-4 text-sm text-red-600">{erro}</p>}

        <button
          type="button"
          disabled={pagando || !completo || !freteOpcao}
          onClick={handlePagar}
          className="btn-gold mt-8 w-full rounded-xl py-3.5 text-base disabled:opacity-50"
        >
          {pagando ? "Processando..." : mockPagamento ? "Pagar (mock)" : "Ir para pagamento"}
        </button>
        {!freteOpcao && (
          <p className="mt-2 text-center text-xs text-amber-700">
            Selecione uma opção de frete para continuar.
          </p>
        )}
        {!mockPagamento && (
          <p className="mt-2 text-center text-xs text-zinc-500">
            Pagamento via Mercado Pago
            {pagamentoCfg.aceitaCartao
              ? ` — cartão em até ${pagamentoCfg.maxParcelasCartao}x`
              : ""}
            .
          </p>
        )}
        {mockPagamento && (
          <p className="mt-2 text-center text-xs text-zinc-500">
            Simula pagamento aprovado e registra o pedido no admin.
          </p>
        )}

        <button
          type="button"
          onClick={() => router.push(paths.carrinho)}
          className="mt-3 w-full rounded-xl border border-zinc-300 bg-white py-2.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
        >
          Editar carrinho
        </button>
      </main>

      {modalConfirmar && (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
        >
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-xl">
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2 className="text-lg font-bold text-zinc-900">
                Confirmar cases personalizadas
              </h2>
              <p className="mt-1 text-sm text-zinc-600">
                Confira como ficou antes de finalizar o pagamento.
              </p>
            </div>
            <ul className="space-y-6 px-5 py-6">
              {itens
                .filter((i) => i.tipo === "personalizada" && i.personalizacao)
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col items-center gap-3 rounded-xl bg-zinc-50 p-4"
                  >
                    <CasePreview
                      fotoUrl={item.personalizacao!.fotoUrl}
                      transform={item.personalizacao!.transform}
                      textos={item.personalizacao!.textos}
                      modeloId={item.personalizacao!.modeloId}
                      larguraPx={item.personalizacao!.larguraPx}
                      alturaPx={item.personalizacao!.alturaPx}
                      previewWidth={220}
                    />
                    {item.personalizacao?.titulo && (
                      <p className="text-sm font-medium text-zinc-900">
                        {item.personalizacao.titulo}
                      </p>
                    )}
                    {item.personalizacao?.descricao && (
                      <p className="text-center text-xs text-zinc-600">
                        {item.personalizacao.descricao}
                      </p>
                    )}
                  </li>
                ))}
            </ul>
            <div className="pb-safe flex flex-col gap-2 border-t border-zinc-200 px-5 py-4 sm:flex-row-reverse sm:pb-4">
              <button
                type="button"
                disabled={pagando}
                onClick={() => void executarPagamento()}
                className="btn-gold rounded-xl py-3 text-sm disabled:opacity-50"
              >
                {pagando ? "Processando..." : mockPagamento ? "Confirmar (mock)" : "Confirmar e pagar"}
              </button>
              <button
                type="button"
                disabled={pagando}
                onClick={() => setModalConfirmar(false)}
                className="rounded-xl border border-zinc-300 py-3 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
