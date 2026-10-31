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

## 🛡️ Políticas de Segurança e Quota
- Tokens sensíveis e refresh tokens permanecem isolados e criptografados no backend.
- Não há automação indiscriminada em massa; a aplicação apoia a revisão individual e a abertura manual no YouTube.
