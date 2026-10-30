# Plano de Execução — YouTube Subscriber Engagement

**Versão:** 1.0  
**Data:** 11/10/2026  
**Status:** Planejamento inicial

## 1. Objetivo

Construir uma aplicação web para desktop e dispositivos móveis, instalável como PWA, para organizar os inscritos acessíveis do próprio canal do YouTube, localizar os canais encontrados, identificar seus vídeos públicos mais recentes e preparar comentários editáveis.

A aplicação deve usar APIs oficiais e oferecer uma experiência segura, com revisão explícita antes de qualquer ação de interação permitida. Não se deve presumir que a API permita listar todos os inscritos nem executar ações em massa irrestritas.

## 2. Escopo do MVP

### Incluído
- Login com Google OAuth 2.0.
- Identificação do canal autenticado.
- Sincronização dos inscritos acessíveis pela YouTube Data API v3.
- Persistência dos canais e dos vídeos encontrados em SQLite.
- Consulta do vídeo público mais recente de cada canal identificável.
- Dashboard com indicadores e estado da sincronização.
- Lista de canais com pesquisa, filtros e paginação.
- Modelos de comentários editáveis, com variáveis e prévia.
- Abertura do canal/vídeo no YouTube para interação manual.
- Histórico de sincronizações e erros.
- Frontend responsivo e instalável como PWA.
- Testes automatizados das regras de negócio e endpoints principais.

### Fora do escopo inicial
- Garantia de listar 100% dos inscritos.
- Robô de navegador, automação de cliques ou contorno de limites da plataforma.
- Publicação irrestrita de comentários/curtidas em massa.
- Aplicativos nativos publicados nas lojas Apple/Google.
- Redis/BullMQ obrigatório desde o primeiro dia.
- Multiusuário, planos comerciais e cobrança.

## 3. Arquitetura escolhida

### Frontend
- Vue 3
- Vite
- TypeScript
- Vue Router
- Pinia
- Tailwind CSS
- Shadcn Vue (opcional, conforme os componentes necessários)
- `vite-plugin-pwa` para manifesto e service worker
- Vitest e Playwright para testes

### Backend
- Node.js + TypeScript
- NestJS
- Prisma ORM
- SQLite para o MVP
- Google APIs client (`googleapis`)
- Validação com DTOs e `class-validator`/`class-transformer`, ou Zod em uma camada compartilhada
- Testes com Jest (padrão NestJS) ou Vitest, mantendo uma única estratégia consistente

### Processamento
- Primeira versão: tarefas assíncronas controladas pelo backend, com estado persistido no SQLite.
- Evolução: Redis + BullMQ quando houver volume, concorrência ou necessidade de workers separados.
- Implementar paginação, limites de concorrência, backoff e tratamento de quota desde o MVP.

### Integração
- YouTube Data API v3
- Google OAuth 2.0
- Tokens e credenciais mantidos somente no backend.

## 4. Estrutura sugerida do repositório

```text
youtube-engagement/
├── apps/
│   ├── api/                  # NestJS
│   │   └── src/
│   │       ├── auth/
│   │       ├── youtube/
│   │       ├── subscribers/
│   │       ├── channels/
│   │       ├── videos/
│   │       ├── comment-templates/
│   │       ├── engagement/
│   │       ├── jobs/
│   │       ├── audit/
│   │       └── common/
│   └── web/                  # Vue 3 + Vite + PWA
│       └── src/
│           ├── components/
│           ├── composables/
│           ├── pages/
│           ├── router/
│           ├── stores/
│           ├── services/
│           └── types/
├── prisma/
│   └── schema.prisma
├── docs/
├── .env.example
├── package.json
└── README.md
```

O frontend starter já criado pode servir como base visual. Antes de integrá-lo, revisar scripts, dependências e estrutura para acomodá-lo ao monorepo e garantir que o build e o PWA funcionem na versão escolhida das dependências.

## 5. Modelo de dados inicial

### `Channel`
- `id`
- `youtubeChannelId` (único)
- `title`
- `thumbnailUrl`
- `description` (opcional, se necessária)
- `lastSyncedAt`
- `createdAt`
- `updatedAt`

### `Video`
- `id`
- `youtubeVideoId` (único)
- `channelId`
- `title`
- `url`
- `publishedAt`
- `checkedAt`

### `CommentTemplate`
- `id`
- `name`
- `content`
- `createdAt`
- `updatedAt`

### `EngagementAction`
Registra ações preparadas ou realizadas, sem assumir que toda ação poderá ser automatizada.
- `id`
- `channelId`
- `videoId`
- `type`
- `status`
- `commentText` (opcional)
- `confirmedAt` (opcional)
- `executedAt` (opcional)
- `error` (opcional)
- `createdAt`

### `SyncJob`
- `id`
- `type`
- `status`
- `processedCount`
- `errorCount`
- `startedAt`
- `finishedAt`
- `error` (opcional)
- `createdAt`

### `GoogleClientConfig` (Multi-Projetos / Multi-Canais)
Armazena configurações de múltiplos clientes Google Cloud OAuth para conectar diferentes canais:
- `id`
- `name` (identificador descritivo, ex: "Sol Nascente", "Pétalas")
- `clientId`
- `clientSecret` (criptografado em repouso com AES-256-GCM)
- `redirectUri` (padrão `/api/auth/google/callback`)
- `isDefault` (booleano: se verdadeiro, conecta direto sem exibir modal de escolha)
- `createdAt`
- `updatedAt`

### Segurança dos tokens
Criar armazenamento separado para credenciais OAuth associadas ao usuário/canal, com refresh token e client secret criptografados em repouso com chave simétrica. Nunca enviar tokens ou segredos ao frontend, logs ou respostas da API.

## 6. APIs internas sugeridas

| Método | Endpoint | Descrição |
|---|---|---|
| `GET` | `/api/auth/google` | Iniciar OAuth (suporta query `clientConfigId`) |
| `GET` | `/api/auth/google/callback` | Finalizar OAuth |
| `GET` | `/api/auth/google/options` | Consultar credencial padrão e lista de canais disponíveis para login |
| `GET` | `/api/auth/google-clients` | Listar credenciais cadastradas (secrets mascarados) |
| `POST` | `/api/auth/google-clients` | Cadastrar nova credencial (criptografa o secret) |
| `PATCH` | `/api/auth/google-clients/:id` | Editar credencial existente |
| `DELETE` | `/api/auth/google-clients/:id` | Excluir credencial |
| `POST` | `/api/auth/google-clients/:id/set-default` | Marcar credencial como padrão para login direto |
| `POST` | `/api/auth/logout` | Encerrar sessão |
| `GET` | `/api/channel/me` | Consultar canal autenticado |
| `POST` | `/api/sync/subscribers` | Iniciar sincronização |
| `GET` | `/api/subscribers` | Listar canais armazenados, com filtros/paginação |
| `GET` | `/api/channels/:id` | Detalhes do canal |
| `POST` | `/api/channels/:id/sync` | Atualizar dados e vídeo recente |
| `GET` | `/api/channels/:id/latest-video` | Obter último vídeo conhecido |
| `GET` | `/api/comment-templates` | Listar modelos |
| `POST` | `/api/comment-templates` | Criar modelo |
| `PATCH` | `/api/comment-templates/:id` | Editar modelo |
| `DELETE` | `/api/comment-templates/:id` | Excluir modelo |
| `POST` | `/api/engagement/preview` | Preparar texto/ação para revisão |
| `POST` | `/api/engagement/execute` | Executar somente ação autorizada, validada e permitida |
| `GET` | `/api/jobs/:id` | Consultar estado de tarefa |
| `GET` | `/api/audit` | Consultar histórico |

As rotas devem validar sessão, entrada, propriedade dos recursos, limites de requisição e permissões. O endpoint de execução não deve oferecer operação genérica de interação em massa.

## 7. Plano de execução por fases

As estimativas são indicativas para uma pessoa desenvolvedora e podem variar conforme experiência, OAuth, quota e aprovação de acesso.

### Fase 0 — Preparação e decisões (0,5–1 dia)
- [ ] Confirmar versão de Node.js e gerenciador de pacotes.
- [ ] Definir monorepo ou repositórios separados.
- [ ] Criar projeto no Google Cloud e ativar YouTube Data API v3.
- [ ] Configurar consent screen OAuth, URLs de callback e variáveis de ambiente.
- [ ] Definir política de privacidade e escopos mínimos necessários.
- [ ] Definir ambiente local e estratégia de deploy.

**Critério de aceite:** aplicação Google configurada em ambiente de teste e variáveis documentadas em `.env.example`, sem segredos versionados.

### Fase 1 — Fundação técnica (1–2 dias)
- [x] Criar app NestJS com módulos e configuração.
- [x] Criar frontend Vue 3 + Vite + TypeScript.
- [x] Configurar SQLite, Prisma e migrations.
- [x] Configurar lint, formatação, type-check e testes.
- [x] Configurar CORS, validação global, filtros de exceção e logging seguro.
- [x] Definir contrato inicial da API e tipos compartilhados.

**Critério de aceite:** backend e frontend iniciam localmente; migration executa; health check funciona; build e type-check passam.

### Fase 2 — OAuth e sessão (1–2 dias)
- [x] Implementar fluxo Google OAuth no backend.
- [x] Validar `state` e callbacks para prevenir CSRF.
- [x] Solicitar apenas os escopos necessários.
- [x] Criar sessão segura com cookies `HttpOnly`, `Secure` em produção e política `SameSite` apropriada.
- [x] Armazenar tokens no backend e implementar renovação/expiração.
- [x] Implementar logout e tratamento de revogação.

**Critério de aceite:** usuário consegue autenticar, visualizar o canal conectado e encerrar a sessão; nenhum token sensível aparece no frontend ou nos logs.

### Fase 3 — Sincronização de inscritos e canais (2–3 dias)
- [x] Implementar cliente isolado para YouTube Data API.
- [x] Consultar inscritos acessíveis com paginação.
- [x] Persistir resultados incrementalmente, usando o ID do canal como chave externa.
- [x] Tratar canais ausentes, dados privados, respostas parciais, erros transitórios e quota.
- [x] Registrar progresso e falhas em `SyncJob`.
- [x] Criar filtros e paginação para a listagem local.

**Critério de aceite:** sincronização pode ser iniciada e acompanhada; reexecutar não duplica canais; erros são apresentados de forma compreensível.

**Limitação:** o endpoint de inscritos não garante que todos os inscritos sejam retornados. A interface deve indicar que a lista é a dos inscritos acessíveis pela API.

### Fase 4 — Últimos vídeos (1–2 dias)
- [x] Obter a playlist de uploads de cada canal identificável.
- [x] Consultar itens recentes e validar os vídeos com a API.
- [x] Guardar título, ID, URL e data de publicação.
- [x] Tratar canais sem vídeos públicos ou sem dados disponíveis.
- [x] Evitar chamadas repetidas com cache e atualização incremental.

**Critério de aceite:** canais com uploads públicos exibem o vídeo mais recente conhecido e podem abrir a página do vídeo no YouTube.

### Fase 5 — Frontend desktop e PWA (2–4 dias)
- [x] Integrar o dashboard com endpoints reais.
- [x] Implementar estados de carregamento, vazio, erro e sucesso.
- [x] Implementar pesquisa, filtros, paginação e detalhes dos canais.
- [x] Criar editor de modelos de comentário com prévia e cópia.
- [x] Implementar layout responsivo e navegação mobile.
- [x] Configurar manifesto, ícones e service worker.
- [x] Validar instalação em desktop, Android e iOS quando aplicável.
- [x] Definir cache PWA sem armazenar tokens nem dados privados sensíveis no cache offline.

**Critério de aceite:** a interface funciona em viewport desktop e mobile; o build de produção instala como PWA em navegadores compatíveis; a aplicação explica quando está sem conexão.

### Fase 6 — Histórico e preparação de interações (1–2 dias)
- [x] Criar modelos editáveis e variáveis suportadas, por exemplo `{assunto}`.
- [x] Gerar prévia e permitir copiar o texto.
- [x] Registrar ação preparada, confirmada, concluída ou falha.
- [x] Abrir canal/vídeo para interação manual.
- [x] Adicionar confirmação individual antes de qualquer ação permitida pela API.
- [x] Implementar idempotência para impedir duplicação acidental.
- [x] Revisar políticas do YouTube antes de habilitar publicação via API.

**Critério de aceite:** usuário consegue preparar e revisar um comentário, copiar o conteúdo, abrir o vídeo e consultar o histórico. A aplicação não executa interações indiscriminadas.

### Fase 7 — Testes, segurança e piloto (1–3 dias)
- [ ] Testar serviços com mocks da YouTube Data API.
- [ ] Testar controllers com Supertest.
- [ ] Testar modelos de comentário e estados de sincronização.
- [ ] Testar navegação e responsividade com Playwright.
- [ ] Testar sessão, CSRF, validação, rate limiting e tratamento de falhas.
- [ ] Confirmar que logs não contêm tokens nem dados desnecessários.
- [ ] Testar quota e backoff com falhas simuladas.
- [ ] Rodar piloto com poucos canais e revisar resultados.

**Critério de aceite:** testes críticos passam; erros não deixam jobs presos; aplicação não revela credenciais; piloto é concluído sem duplicações.

### Fase 8 — Deploy e operação (1–2 dias)
- [ ] Escolher hospedagem para frontend e backend.
- [ ] Configurar HTTPS, domínio, CORS e URLs OAuth de produção.
- [ ] Garantir armazenamento persistente do arquivo SQLite e backups.
- [ ] Configurar monitoramento, logs redigidos e alertas de falha.
- [ ] Documentar migrações, recuperação e atualização do PWA.
- [ ] Confirmar obrigações e requisitos de conformidade da API para produção.

**Critério de aceite:** aplicação publicada em HTTPS, com dados persistentes, procedimento de backup e documentação operacional.

## 8. Estimativa total

| Entrega | Estimativa |
|---|---:|
| Preparação e fundação | 1,5–3 dias |
| OAuth | 1–2 dias |
| Inscritos e canais | 2–3 dias |
| Últimos vídeos | 1–2 dias |
| Frontend e PWA | 2–4 dias |
| Modelos e histórico | 1–2 dias |
| Testes e piloto | 1–3 dias |
| Deploy | 1–2 dias |
| **Total indicativo** | **10,5–21 dias úteis** |

As fases podem se sobrepor parcialmente. Aprovações do Google, verificação OAuth, ajustes de quota e requisitos de conformidade podem ampliar o calendário.

## 9. Regras técnicas e de produto

1. **API oficial:** não usar scraping, automação de navegador ou técnicas para contornar limites.
2. **Inscritos:** apresentar a lista como “inscritos acessíveis”, sem prometer completude.
3. **Interações:** priorizar preparação, prévia, cópia e abertura manual do vídeo. Habilitar ações pela API somente após validação das políticas e permissões aplicáveis.
4. **Anti-spam:** evitar comentários repetitivos, genéricos ou em massa.
5. **OAuth:** tokens permanecem no backend; escopos mínimos; sessão protegida.
6. **PWA:** não armazenar segredos, tokens ou conteúdo privado no service worker/cache.
7. **Quota:** centralizar chamadas, registrar consumo quando possível, limitar concorrência e aplicar backoff.
8. **Dados:** IDs externos únicos, sincronização idempotente, política de retenção e exclusão.
9. **Acessibilidade:** foco visível, labels em controles, contraste adequado e suporte a redução de movimento.
10. **Observabilidade:** registrar IDs de job e erros sanitizados, sem incluir tokens ou segredos.

## 10. Variáveis de ambiente previstas

Exemplo de `.env.example` (usar valores fictícios; não comitar `.env` real):

```dotenv
NODE_ENV=development
PORT=3000
WEB_ORIGIN=http://localhost:5173
DATABASE_URL=file:./dev.db

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google/callback

SESSION_SECRET=
TOKEN_ENCRYPTION_KEY=
```

A implementação deve seguir as recomendações atuais do Google OAuth e da versão escolhida do Prisma. O formato exato do datasource e do adaptador SQLite pode variar conforme a versão do Prisma instalada.

## 11. Comandos esperados no dia a dia

Os comandos finais devem ser confirmados quando o monorepo for criado. Exemplo de scripts planejados:

```bash
# Desenvolvimento
npm run dev

# Verificação de tipos
npm run type-check

# Testes
npm run test

# Build
npm run build

# Migração local do banco
npx prisma migrate dev
```

## 12. Referências oficiais

- YouTube Data API: https://developers.google.com/youtube/v3
- `subscriptions.list`: https://developers.google.com/youtube/v3/docs/subscriptions/list
- `channels.list`: https://developers.google.com/youtube/v3/docs/channels/list
- `playlistItems.list`: https://developers.google.com/youtube/v3/docs/playlistItems/list
- `videos.list`: https://developers.google.com/youtube/v3/docs/videos/list
- Comentários: https://developers.google.com/youtube/v3/docs/commentThreads/insert
- Avaliações: https://developers.google.com/youtube/v3/docs/videos/rate
- Políticas de serviços da API do YouTube: https://developers.google.com/youtube/terms/developer-policies
- Vue: https://vuejs.org/
- NestJS: https://docs.nestjs.com/
- Prisma: https://www.prisma.io/docs
- PWA: https://web.dev/learn/pwa/

---

## Definição de pronto do MVP

O MVP será considerado pronto quando:

- [ ] O proprietário autenticar o canal via OAuth.
- [ ] A aplicação sincronizar e exibir inscritos acessíveis sem duplicar registros.
- [ ] Cada canal disponível mostrar o último vídeo público conhecido, quando houver.
- [ ] O usuário pesquisar e filtrar a lista no desktop e no celular.
- [ ] O usuário criar, editar, pré-visualizar e copiar modelos de comentário.
- [ ] O usuário abrir manualmente o canal ou vídeo para interagir.
- [ ] Jobs e falhas forem consultáveis no histórico.
- [ ] A PWA funcionar em navegadores compatíveis via HTTPS.
- [ ] Testes críticos e verificações de segurança passarem.
- [ ] Nenhuma credencial ou token for exposto no frontend ou nos logs.
