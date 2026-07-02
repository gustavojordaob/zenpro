# Multi-tenant — fundação (fatia 1)

Implementação conforme `obsidian/fabrica/capinhas-multitenant.md`. **Sem telas de admin** nesta fatia.

## Coleções

| Coleção | Escopo | Quem escreve |
|---------|--------|--------------|
| `produtos/{id}` | Catálogo central da marca | `papel == "marca"` |
| `modelos_celular/{id}` | Molduras centrais | `papel == "marca"` |
| `lojas/{lojaId}` | Revendedor (slug, config, dono) | Marca cria; marca ou dono edita |
| `lojas/{lojaId}/pedidos/{id}` | Pedidos por loja | Marca ou revendedor da loja |
| `usuarios/{uid}` | Perfil + `papel` / `lojaId` | Cliente edita perfil; `papel` só via marca/seed |

Tipos TypeScript: `src/features/multitenant/types.ts`

## Setup

### 1. Service account

Firebase Console → Project settings → Service accounts → Generate new private key.

```powershell
$env:GOOGLE_APPLICATION_CREDENTIALS = "C:\caminho\zenpro-capinhas-sa.json"
$env:FIREBASE_PROJECT_ID = "zenpro-capinhas"
```

### 2. Seed (Auth + Firestore)

```powershell
npm run seed:multitenant
```

Cria **2 lojas (A e B)**, **1 revendedor em cada**, **1 pedido em cada**:

| Recurso | Detalhe |
|---------|---------|
| Marca | `marca@zenpro.test` / `MarcaZenpro123!` |
| Revendedor A | `revendedor-a@zenpro.test` / `RevendedorA123!` → `lojas/loja-a` |
| Revendedor B | `revendedor-b@zenpro.test` / `RevendedorB123!` → `lojas/loja-b` |
| Pedido A | `lojas/loja-a/pedidos/pedido-loja-a-001` |
| Pedido B | `lojas/loja-b/pedidos/pedido-loja-b-001` |
| Catálogo | Produtos e modelos migrados do mock |

### 3. Deploy das rules

```powershell
npm run firebase:deploy-rules
```

## Testar isolamento (automático)

Com Firestore Emulator (recomendado):

```powershell
npm run test:rules:multitenant
```

Isso executa `firebase emulators:exec` + `scripts/test-multitenant-rules.mjs`.

Cenários validados:

1. Revendedor loja A **NÃO lê** pedido da loja B → `permission-denied`
2. Revendedor loja A **lê** pedido da própria loja A → OK
3. Marca **lê** pedidos das lojas A e B → OK

## Testar manualmente (Console ou app)

1. Faça login como `revendedor-a@zenpro.test`
2. No Firestore SDK:

```javascript
// Deve funcionar (própria loja)
await getDoc(doc(db, "lojas/loja-a/pedidos/pedido-loja-a-001"));

// Deve falhar: permission-denied (outra loja)
await getDoc(doc(db, "lojas/loja-b/pedidos/pedido-loja-b-001"));
```

3. Login como `marca@zenpro.test` — ambas as leituras devem funcionar.

### Rules Playground (Firebase Console)

1. Firestore → Rules → **Rules Playground**
2. Simule `request.auth.uid = <uid revendedor A>`
3. Path: `/lojas/loja-b/pedidos/pedido-loja-b-001` → **Denied**
4. Path: `/lojas/loja-a/pedidos/pedido-loja-a-001` → **Allowed**

## O que NÃO está nesta fatia

- Rotas `/{slug}` no Next.js
- `/admin` marca ou revendedor
- Pedidos da loja pública ainda usam `pedidos/` raiz (single-tenant atual)
- Migração do checkout para `lojas/{id}/pedidos` → fatia 6

## Branch

`feature/multitenant` — **sem merge** até fatias 2–6.

---

## Fatia 2 — Auth + papéis (admin)

### Rotas

| Rota | Quem acessa |
|------|-------------|
| `/admin/login` | Público (login admin) |
| `/admin` | Só **marca** (visão geral) |
| `/admin/lojas/[lojaId]` | **Marca** (qualquer loja) ou **revendedor** (só a própria `lojaId`) |

### Hook

`useAuthAdmin()` → `{ uid, user, sessao, papel, lojaId, isMarca, isRevendedor, carregando }`

### Testar login (seed)

1. `npm run seed:multitenant` (se ainda não rodou)
2. Abrir `/admin/login`
3. **Marca** → redireciona para `/admin`
4. **Revendedor A** → redireciona para `/admin/lojas/loja-a`
5. **Revendedor B** → redireciona para `/admin/lojas/loja-b`
6. Rev. A tentando `/admin` → redireciona para `/admin/lojas/loja-a`
7. Rev. A tentando `/admin/lojas/loja-b` → redireciona para `/admin/lojas/loja-a`
8. Cliente da loja (`/login`) sem `papel` → mensagem de sem permissão no admin
