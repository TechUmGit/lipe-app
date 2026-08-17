# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some Oxlint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/)

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the Oxlint configuration

If you are developing a production application, we recommend enabling type-aware lint rules by installing `oxlint-tsgolint` and editing `.oxlintrc.json`:

```json
{
  "$schema": "./node_modules/oxlint/configuration_schema.json",
  "plugins": ["react", "typescript", "oxc"],
  "options": {
    "typeAware": true
  },
  "rules": {
    "react/rules-of-hooks": "error",
    "react/only-export-components": ["warn", { "allowConstantExport": true }]
  }
}
```

See the [Oxlint rules documentation](https://oxc.rs/docs/guide/usage/linter/rules) for the full list of rules and categories.

## Integração Pluggy (Open Finance) — setup e deploy

O código do backend já está em `functions/`, mas o deploy e a configuração de
secrets precisam ser feitos manualmente (exigem acesso às suas contas
Firebase/Pluggy que eu não tenho). Passo a passo:

### 1. Plano do Firebase

Cloud Functions (2ª geração) exige o plano **Blaze** (pay-as-you-go) no
projeto `lipe-13d18`. Confira em
https://console.firebase.google.com/project/lipe-13d18/usage/details — se
ainda estiver no Spark, faça o upgrade antes de tentar deployar.

### 2. Guardar as chaves da Pluggy como secret

```bash
cd functions
firebase functions:secrets:set PLUGGY_CLIENT_ID
firebase functions:secrets:set PLUGGY_CLIENT_SECRET
```

Cada comando pede o valor via prompt interativo — nunca coloque essas chaves
em `.env`, `.env.local` ou em qualquer arquivo commitado.

### 3. Deploy das functions

```bash
cd functions
npm install
npm run deploy
```

Isso builda o TypeScript e sobe `pluggyConnectToken`, `pluggyItemCallback`,
`pluggyMapearConta`, `pluggySync` e `pluggyWebhook`. Anote a URL impressa
pra `pluggyWebhook` — se ela não seguir o padrão
`https://us-central1-lipe-13d18.cloudfunctions.net/pluggyWebhook`, ajuste
`REGION`/`urlWebhook` em `functions/src/config.ts` e faça deploy de novo.

### 4. Registrar o webhook na Pluggy

No dashboard da Pluggy, configure a URL do passo 3 como webhook do seu
`CLIENT_ID` (ou deixe como está se você preferir que o app registre por
conexão — hoje o `pluggyConnectToken` já manda essa URL a cada conexão nova).

### 5. Testar

No app, vá em **Finanças → ícone de banco (🏦) → Conectar nova conta**. Isso
abre o widget oficial da Pluggy — só você pode passar pelo login/MFA do
Nubank e do BTG. Depois de conectar, confirme o nome de cada conta e rode
"Sincronizar agora". Confira o resultado em **Conciliação** antes de confiar
no automatismo — a lógica de casamento (`functions/src/reconciliacao.ts`) e
o cliente da API (`functions/src/pluggyClient.ts`) foram implementados a
partir da documentação da Pluggy, sem um teste real contra o sandbox deles
(ninguém aqui tinha as chaves nem podia passar pelo MFA do banco). O ponto
mais provável de precisar ajuste é a **convenção de sinal do valor em
contas de cartão de crédito** — veja o comentário em `normalizarValor()`.
