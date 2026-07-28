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

### Formas de pagamento (Checkout Pro)

O cliente escolhe no site; a preference MP **restringe** o checkout:

| Forma no site | Preference |
|---|---|
| PIX | exclui credit/debit/ticket/atm/prepaid; `default_payment_method_id: pix`. **Não** excluir `account_money` (MP rejeita) |
| Cartão Nx | exclui boleto/PIX/débito; `installments` = `default_installments` = N |
| Boleto | exclui cartão/PIX |

`mapFormaParaMp` em `functions/src/mercadoPagoShared.ts`.

> **Nota:** no Checkout Pro, `installments: N` é o **teto** (1x…Nx). Não dá para forçar “somente 2x” sem Brick/API própria.

### Desconto PIX / parcelas

- **Padrão loja:** `lojas/{id}.config.pagamentoPadrao` (Admin → Loja, só marca)
- **Por produto:** `produtos/{id}.pagamento.descontoPixPercentual` e `maxParcelasCartao` (0/null = herda loja)
- Checkout: produto sobrescreve loja; interseção no carrinho (menor desconto / menor máx. parcelas)


### Qualidade / aprovação de cartão

Na preferência Checkout Pro, cada item envia `description` (e `category_id`) — recomendação do painel MP (“Descrição do item”) para reduzir recusas do antifraude.

### Botão “Pagar” cinza / não paga

Causas comuns:

1. **Comprador = vendedor** — a mesma conta MP do Access Token não pode pagar a própria loja. Teste em aba anônima com **outro** e-mail/CPF.  
2. Conta MP da loja incompleta (dados / receber pagamentos).  
3. Credential de teste vs produção trocada.

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
NEXT_PUBLIC_SITE_URL=https://usezenpro.com.br
NEXT_PUBLIC_MOCK_PAGAMENTO=false
NEXT_PUBLIC_MP_PUBLIC_KEY=APP_USR-...   # public key da aplicação MP
NEXT_PUBLIC_MP_SANDBOX=false
```

> Access Token, Client ID e Client Secret **nunca** vão no frontend nem no Git — só `MP_ACCESS_TOKEN` no Secret Manager.

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
- [ ] Painel MP: sem juros só à vista (1x); 2x+ com juros
- [ ] Focus NFe (opcional) ou emissão manual no admin
