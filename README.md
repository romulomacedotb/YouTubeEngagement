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

## 🛡️ Políticas de Segurança e Quota
- Tokens sensíveis e refresh tokens permanecem isolados e criptografados no backend.
- Não há automação indiscriminada em massa; a aplicação apoia a revisão individual e a abertura manual no YouTube.
