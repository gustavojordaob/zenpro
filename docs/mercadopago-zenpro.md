# Mercado Pago — Zen Pro (checkout loja + reposição B2B)

> **Agente Cursor — use MCP antes de codar**
>
> - MCP **mercadopago** — preferências, webhooks, parcelamento
> - MCP **fabrica-apps** — `rag_buscar("mercadopago checkout webhook")`
>
> Repo: `c:\Users\gusta\projetos\zenpro`

## Fluxos

| Fluxo | Coleção | Pagamento | Envio |
|-------|---------|-----------|-------|
| Cliente (B2C) | `lojas/{lojaId}/pedidos` | Checkout Pro MP | Após `pagamentoLiberadoEnvio` |
| Revendedor (B2B) | `pedidos_reposicao` | Checkout Pro MP | Após `pago` ou `aprovado` (crédito) |

## Formas de pagamento

- **PIX** — aprovação rápida
- **Boleto** — envio só após compensação (`pagamentoLiberadoEnvio`)
- **Cartão** — até **12x**; **1x e 2x sem juros** (configurar também no painel MP do vendedor)

## Cloud Functions

| Função | Tipo | Uso |
|--------|------|-----|
| `criarCheckoutMercadoPago` | Callable | Cria preferência e retorna `initPoint` |
| `webhookMercadoPago` | HTTP | Confirma pagamento, baixa estoque, enfileira NF |
| `processarNotaFiscalOutbox` | Firestore trigger | Emite NF (Focus NFe) ou marca pendente manual |

## Secrets / env

```powershell
firebase functions:secrets:set MP_ACCESS_TOKEN
# Opcional NF automática:
firebase functions:secrets:set FOCUS_NFE_TOKEN
```

Functions params: `SITE_URL`, `FOCUS_NFE_AMBIENTE`, `FOCUS_NFE_CNPJ_EMITENTE`

Frontend `.env.local`:

```
NEXT_PUBLIC_SITE_URL=https://zenpro-capinhas.web.app
NEXT_PUBLIC_MOCK_PAGAMENTO=false
```

## Webhook Mercado Pago

URL: `https://us-central1-zenpro-capinhas.cloudfunctions.net/webhookMercadoPago`

`external_reference`: `zenpro:loja:{lojaId}:{pedidoId}` ou `zenpro:reposicao:{pedidoId}`

## Rastreio e NF

Campos em pedido: `envio.{transportadora,codigoRastreio,urlRastreio}`, `notaFiscal.{status,numero,chaveAcesso,pdfUrl}`.

Admin: `/admin/pedidos/detalhe` — edição manual de rastreio e NF.

Cliente: `/meus-pedidos` — exibe rastreio e link da nota.

## Deploy

```powershell
cd functions; npm run build; cd ..
npm run build
firebase deploy --only "functions,firestore:rules,hosting"
```

## Checklist

- [ ] `MP_ACCESS_TOKEN` (produção ou sandbox)
- [ ] Webhook cadastrado no painel MP
- [ ] `NEXT_PUBLIC_MOCK_PAGAMENTO=false` em produção
- [ ] Parcelamento sem juros até 2x no painel MP
- [ ] Focus NFe (opcional) ou emissão manual no admin
