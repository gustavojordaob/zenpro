# Zenpro — persistência Firebase

Projeto: `zenpro-capinhas` (`.firebaserc`)

> **PROJECT completo:** `obsidian/projetos/zenpro-project.md`  
> **Estoque:** `obsidian/fabrica/zenpro-estoque-multitenant.md`

## Coleções (canônico — multitenant)

| Coleção | Quando grava |
|---------|--------------|
| `personalizacoes/{id}` | Comprar no editor (por usuário) |
| `lojas/{lojaId}/pedidos/{id}` | Checkout (`criarPedidoLoja`) |
| `lojas/{lojaId}/estoque/{produtoId}` | Admin → Estoque |
| `produtos/{id}.estoqueCentral` | Admin → Produtos |
| `usuarios/{uid}/pedidos/{id}` | Índice “Meus pedidos” |
| `pedidos_reposicao/{id}` | Reposição B2B |

A coleção raiz `pedidos/{id}` é **legado** — checkout atual não usa.

## Loja da marca

- ID: `zenpro` (`MARCA_LOJA_ID`)
- Checkout na raiz `/` → `lojas/zenpro/pedidos`
- Estoque: Admin → Estoque → **Zen Pro (loja oficial)**

## Deploy rules

```powershell
firebase deploy --only firestore:rules,storage --project zenpro-capinhas
```

## Docs relacionados

- `docs/multitenant-fundacao.md` — seed e rules
- `docs/mercadopago-zenpro.md` — pagamentos
- `docs/nota-fiscal-rastreio-automatico.md` — NF e rastreio
