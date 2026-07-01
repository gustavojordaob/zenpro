# Zenpro — persistência Firebase

Projeto Firebase: `zenpro-capinhas` (ver `.firebaserc`).

## Coleções Firestore

| Coleção | Quando grava | Campos principais |
|---------|--------------|-------------------|
| `personalizacoes/{id}` | Botão **Comprar** no editor | `fotoUrl`, `modeloId`, `transform`, `criadoEm` |
| `pedidos/{id}` | Botão **Pagar** no checkout | `itens[]`, `totalCentavos`, `status`, `cliente`, `criadoEm` |

A foto já está no **Storage** (`personalizacoes/*.jpg`) antes do doc Firestore.

## Deploy das regras (dev)

```powershell
cd c:\Users\gusta\projetos\zenpro
firebase deploy --only firestore:rules,storage --project zenpro-capinhas
```

Regras abertas para dev, com comentários `TODO fase auth` para restringir depois.

## Como testar

1. `.env.local` com `NEXT_PUBLIC_FIREBASE_*` (projeto zenpro-capinhas).
2. Deploy das rules (comando acima).
3. `npm run dev` → http://localhost:3000/personalizar/iphone-15
4. **Escolher foto** → ajustar → **Comprar**.
5. Console Firebase → Firestore → coleção **`personalizacoes`**:
   - novo doc com `fotoUrl`, `modeloId`, `transform`, `criadoEm`.
6. Storage → pasta **`personalizacoes/`** → arquivo `.jpg` da foto.
7. **Finalizar compra** → **Pagar** no checkout.
8. Firestore → coleção **`pedidos`**:
   - `status`: `aguardando_pagamento`
   - `itens[]` com `personalizacaoId` referenciando o doc acima
   - `cliente` mockado
9. DevTools → console: `pedido` com `pedidoId`.

## Código

- `src/features/loja/salvarPersonalizacao.ts`
- `src/features/loja/criarPedido.ts`
- `firestore.rules` / `storage.rules`
