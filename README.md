# YouTube Subscriber Engagement

Aplicação web e PWA para gerenciar inscritos acessíveis do seu canal no YouTube, acompanhar publicações recentes de vídeos e preparar interações de engajamento manual com segurança e conformidade com as políticas oficiais da Google/YouTube API.

## 📁 Estrutura do Monorepo

```text
youtube-engagement/
├── apps/
│   ├── api/                  # Backend NestJS 10 + Prisma + SQLite
│   │   └── src/
│   │       ├── auth/         # Google OAuth 2.0
│   │       ├── youtube/      # YouTube Data API client
│   │       ├── subscribers/  # Sincronização e listagem de inscritos
│   │       ├── channels/     # Detalhes e gestão de canais
│   │       ├── videos/       # Vídeos recentes e links
│   │       ├── comment-templates/ # Modelos com variáveis
│   │       ├── engagement/   # Preparação e auditoria de interações
│   │       ├── jobs/         # Monitoramento de sincronização
│   │       ├── audit/        # Logs de auditoria
│   │       ├── health/       # Verificação de saúde e SQLite
│   │       └── common/       # Filtros, interceptors e validação
│   ├── desktop/              # Aplicação Desktop Windows (Electron)
│   └── web/                  # Frontend Vue 3 + Vite + Tailwind CSS + PWA
│       └── src/
│           ├── components/   # UI components
│           ├── pages/        # Views e rotas
│           ├── router/       # Vue Router
│           ├── stores/       # Pinia store
│           └── services/     # Cliente HTTP da API
├── packages/
│   └── shared/               # Tipos e DTOs compartilhados em TypeScript
├── prisma/
│   └── schema.prisma         # Modelos SQLite do projeto
├── .env.example
├── package.json
└── README.md
```

## 🚀 Comandos Rápidos

### Instalação de dependências
```bash
npm install
```

### Migração do Banco de Dados SQLite e Geração do Prisma Client
```bash
npm run prisma:generate
npm run prisma:migrate
```

### Desenvolvimento
```bash
# Executar backend (http://localhost:3000)
npm run dev:api

# Executar frontend (http://localhost:5173)
npm run dev:web

# Executar ambos simultaneamente
npm run dev:all
```

### Verificação de Tipos e Testes
```bash
npm run type-check
npm run test
```

### Build de Produção
```bash
npm run build
```

### 🖥️ Aplicação Desktop Windows (Electron)

Você pode utilizar a aplicação diretamente como um executável de computador (.exe) ou continuar usando no navegador normalmente.

#### 1. Executáveis Prontos para Uso
Os executáveis já gerados ficam localizados na pasta `dist-electron/`:
- **Executável Portátil (arquivo único):**
  `dist-electron/YouTube Engagement Studio 1.0.0.exe`
- **Executável Descompactado (iniciação instantânea):**
  `dist-electron/win-unpacked/YouTube Engagement Studio.exe`

Ao iniciar o aplicativo desktop:
- O backend NestJS e o banco SQLite iniciam em segundo plano automaticamente.
- O banco de dados do usuário é gerenciado de forma segura em `%APPDATA%/YouTubeEngagementStudio/youtube_engagement.db`.
- O login com o Google e links do YouTube abrem no navegador padrão do sistema para garantir segurança e compatibilidade com as regras de OAuth da Google.

#### 2. Comandos para Gerar Novo Executável
```bash
# Compilar todos os pacotes e gerar o executável portátil (.exe)
npm run desktop:dist

# Compilar e gerar a pasta descompactada para testes rápidos
npm run desktop:dir
```

---

## 🌐 Execução no Navegador (Web)
Para continuar utilizando pelo navegador como antes, basta rodar:
```bash
npm run dev:all
```
E acessar no seu navegador: **http://localhost:5173** (ou http://localhost:3000).

## ☁️ Hospedagem Gratuita na Nuvem (API + Web com `dev.db` Persistente)

A aplicação já está pronta para rodar gratuitamente (**\$0/mês**) em **Render Free** (ou **Koyeb Free**) usando Docker + **Litestream**, mantendo o arquivo SQLite `dev.db` sempre salvo e atualizado em um bucket S3 gratuito (**Backblaze B2** — 10 GB grátis sem cartão de crédito — ou **Cloudflare R2** — 10 GB grátis).

### Passo 1: Criar o Bucket Gratuito e Enviar seu `dev.db` Atual
1. Crie uma conta gratuita no [Backblaze B2](https://www.backblaze.com/cloud-storage) (não pede cartão) ou Cloudflare R2.
2. Crie um **Bucket Privado** (ex.: `youtube-engagement-db`) e anote o **Endpoint S3** (ex.: `https://s3.us-east-005.backblazeb2.com`).
3. Em **App Keys**, gere uma chave de leitura/escrita exclusiva para esse bucket (`keyID` e `applicationKey`).
4. **Para levar todos os seus dados atuais:** dentro do painel do bucket, crie a pasta `seed/` e envie o seu arquivo local `prisma/dev.db` como **`seed/dev.db`**. No primeiro boot, o container importará automaticamente esse arquivo e passará a replicar todas as atualizações em tempo real a cada 1 segundo!

### Passo 2: Publicar no Render Free (`render.yaml`)
1. Suba o código no seu repositório **GitHub** (o arquivo local `prisma/dev.db` e o `.env` ficam protegidos fora do Git pelo `.gitignore`).
2. No [Render.com](https://render.com), clique em **New + > Blueprint** (ou **New Web Service > Docker**) e selecione o repositório.
3. Preencha as variáveis de ambiente solicitadas:
   - `TOKEN_ENCRYPTION_KEY`: **copie exatamente o mesmo valor do seu `.env` local** (necessário para descriptografar os tokens já salvos no seu `dev.db`).
   - `LITESTREAM_REPLICA_BUCKET`: nome do seu bucket (ex.: `youtube-engagement-db`).
   - `LITESTREAM_REPLICA_ENDPOINT`: endpoint S3 do bucket (ex.: `https://s3.us-east-005.backblazeb2.com`).
   - `LITESTREAM_REPLICA_REGION`: região do bucket (ex.: `us-east-005` no B2 ou `auto` no Cloudflare R2).
   - `LITESTREAM_ACCESS_KEY_ID` e `LITESTREAM_SECRET_ACCESS_KEY`: credenciais S3 geradas no Passo 1.

### Passo 3: Autorizar a URL no Google Cloud Console
1. Após o deploy gerar sua URL HTTPS (ex.: `https://youtube-engagement.onrender.com`), abra o **Google Cloud Console > APIs & Services > Credentials**.
2. Edite seu **OAuth 2.0 Client ID** e adicione em **Authorized redirect URIs**:
   `https://<seu-app>.onrender.com/api/auth/google/callback`
   *(Você pode manter `http://localhost:3000/api/auth/google/callback` junto na mesma lista).*
3. A qualquer momento, acesse **Configurações** na aplicação web e clique em **Baixar `dev.db` Atualizado** caso deseje salvar uma cópia local atualizada no seu computador.

---

## 🛡️ Políticas de Segurança e Quota
- Tokens sensíveis e refresh tokens permanecem isolados e criptografados no backend.
- Não há automação indiscriminada em massa; a aplicação apoia a revisão individual e a abertura manual no YouTube.
