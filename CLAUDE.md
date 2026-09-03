# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Visão geral

Lipe é um PWA pessoal que reúne vários "apps" sob um único login (Firebase
Auth): **Finanças** (extrato, categorias, DRE, conciliação bancária via
Pluggy), **Projetos** (pipeline de projetos/freelas com receita esperada) e
**Treino**. Cada app é um módulo isolado em `src/modules/<nome>/`. O deploy
do frontend é automático (GitHub Pages) a cada push em `main`; o backend
(Cloud Functions) é deploy manual e separado.

## Comandos

```bash
npm run dev       # servidor de dev (Vite)
npm run build     # tsc -b && vite build — falha se houver erro de tipo
npm run lint      # oxlint
npm run preview   # serve o build de produção localmente
```

Não há suíte de testes automatizados neste repositório.

Backend (Cloud Functions, em `functions/`):

```bash
cd functions
npm run build         # tsc
npm run build:watch
npm run serve          # build + firebase emulators:start --only functions
npm run deploy         # build + firebase deploy --only functions (manual, não faz parte do CI)
npm run logs            # firebase functions:log
```

## Arquitetura

### Módulos e roteamento

Cada módulo de app (`financas`, `projetos`, `treino`) segue a mesma
convenção interna: `lib/types.ts` (tipos + constantes), `lib/*Api.ts`
(funções de acesso ao Firestore, uma por coleção), `components/` (modais e
peças reutilizadas dentro do módulo) e `pages/` (uma página por rota). Todas
as rotas passam por `<ProtectedRoute>` (redireciona pra `/login` se não
autenticado) e são declaradas centralmente em `src/App.tsx` — não há
roteamento aninhado dentro dos módulos além do `<Outlet/>` de cada layout.

`Projetos` é uma rota de topo (`/projetos`), independente — não é aninhada
dentro de `financas` apesar de ligado a dinheiro. `Treino` e `Financas` têm
um `*Layout.tsx` próprio (`TreinoLayout`, `FinancasLayout`) que renderiza
`<Topbar>` + navegação (bottom nav ou abas) + `<Outlet/>`.

### Desktop vs. mobile: dois layouts reais, não CSS responsivo

O breakpoint é `min-width: 900px`, lido via `useIsDesktop()`
(`src/shared/hooks/useIsDesktop.ts`, `matchMedia`) — **não** é só CSS. No
Finanças, quando `isDesktop` é `true`, o layout monta os três painéis
(Resumo, Extrato, DRE) **simultaneamente como componentes irmãos**
(`FinancasDashboardDesktop.tsx`), cada um buscando seus próprios dados; no
mobile, as mesmas páginas são rotas separadas por abas. Isso significa que
uma mutação num painel (ex.: dividir um lançamento no Extrato) não atualiza
os outros sozinha — existe um `FinancasRefreshContext`
(`lib/FinancasRefreshContext.ts`) só pra isso: qualquer mutação chama
`notificarMudanca()`, e cada painel deve incluir `refreshKey` nas
dependências do seu efeito de busca. Ao adicionar um novo painel que convive
nesse dashboard, ligue-o a esse contexto ou ele vai ficar com dado velho.

`isDesktop` também controla a classe `body.wide`, que é o que de fato libera
o `#root` de `max-width: 480px` para `max-width: 1180px` (ver `index.css`).
**Qualquer media query de CSS que dependa de "tela larga" tem que usar o
mesmo breakpoint de 900px** — usar um breakpoint diferente (ex. 600px) cria
uma faixa de largura onde o CSS acha que é desktop mas o `#root` ainda está
travado em 480px, e o layout fica espremido (já aconteceu com celular
deitado).

### Firestore: dados por usuário, sem índice central de schema

Toda coleção de dado de usuário fica em `users/{uid}/<nome_da_colecao>`
(ex.: `financas_lancamentos`, `financas_categorias`, `projetos`,
`treino_series`). A regra de segurança (`firestore.rules`) é um wildcard
único (`users/{userId}/{document=**}`) que libera automaticamente qualquer
subcoleção nova — não precisa editar a regra ao criar uma coleção. Isso
também significa que renomear uma coleção (como aconteceu ao mover
`financas_projetos` → `projetos`) **não migra dado nenhum**: os documentos
antigos continuam existindo sob o nome antigo até alguém copiá-los.

Padrão de "vigência" usado em vários lugares (taxa de responsabilidade de
categoria, orçamento mensal, valor mensal de projeto): em vez de um valor
único, guarda um histórico `{ valor, vigenciaDesde }[]`, e uma função
`xxxVigente()` pega a entrada mais recente cuja data já passou. Ao adicionar
um novo campo que muda de valor ao longo do tempo, considere esse padrão em
vez de sobrescrever.

### Integração Pluggy (Open Finance)

Backend em `functions/`, Cloud Functions v2 (`us-central1`, projeto
`lipe-13d18`). Fluxo: `connectToken` (gera token pro widget) →
`itemCallback`/`webhook` (Pluggy avisa de mudança) → `sync` (puxa
transações e concilia com lançamentos manuais via `reconciliacao.ts`,
matching por valor±tolerância, data±tolerância e similaridade de texto). O
`webhook` só marca `precisaSync: true` no documento da conexão e responde
rápido (Pluggy exige resposta em até 5s) — a sincronização de fato roda
depois, disparada pelo frontend ao carregar `ConexoesBancariasPage`. Deploy,
secrets e o webhook não fazem parte do CI — ver README.md para o passo a
passo manual completo, incluindo o aviso de que a convenção de sinal de
valor em cartão de crédito (`normalizarValor()`) nunca foi validada contra
dado real.

### CSS global: duas regras que já causaram bug real

Em `src/index.css`:

- `label { display: flex; flex-direction: column; }` — qualquer `<label>`
  usado como container de uma linha (ex.: checkbox + texto lado a lado)
  precisa sobrescrever `flexDirection: 'row'` explicitamente, senão vira
  coluna e o conteúdo aparece "centralizado" sem motivo aparente.
- `input, select, textarea { width: 100%; }` — um `<input type="checkbox">`
  sem `style={{ width: 18, height: 18 }}` explícito vira uma caixa enorme
  (herda o `width: 100%` genérico).

Utilitários de layout usados em todo o app em vez de CSS por componente:
`.stack` (coluna com gap), `.row` / `.row-between` (linha com gap,
opcionalmente `justify-content: space-between`), `.card`. Prefira reusar
essas classes a escrever flexbox inline repetido.

### Padrão de input numérico controlado

Dois problemas resolvidos e que tendem a reaparecer em campo numérico novo:

1. **Bug do zero à esquerda**: um `<input type="number">` controlado que
   guarda o valor já convertido pra `number` no state trava ao digitar (ex.
   tentar apagar e redigitar "050" vira "50" e o cursor pula). A correção
   usada no projeto é manter o texto bruto digitado num state `string`
   paralelo, e só fazer `Number(texto)` no momento de salvar.
2. **Máscara de moeda**: `MoedaInput` (em
   `src/modules/projetos/components/ProjetoModal.tsx`) formata como R$
   enquanto digita tratando cada tecla como dígito de centavo (como app de
   banco) — a fonte de verdade é sempre o valor numérico prop, nunca um
   texto intermediário, o que evita o bug acima por construção.

## Notas de deploy

- Frontend: `.github/workflows/deploy.yml` builda e publica em GitHub Pages
  a cada push em `main` (`base: '/lipe-app/'` no `vite.config.ts` — o app
  vive num subpath). As chaves `VITE_FIREBASE_*` são públicas (config do
  Firebase Web, não secretas) mas vêm de GitHub Secrets no CI.
- Backend: `firebase deploy --only functions` é sempre manual, feito por
  fora do GitHub Actions.
