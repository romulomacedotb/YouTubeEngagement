<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-bold text-white tracking-tight">Configurações & Conexão OAuth</h1>
      <p class="text-sm text-slate-400">
        Gerenciamento seguro da conexão Google OAuth 2.0, credenciais de projetos Google Cloud e detalhes do canal.
      </p>
    </div>

    <!-- Notification banners from OAuth callback -->
    <div
      v-if="oauthNotice"
      :class="[
        'p-4 rounded-2xl border flex items-center justify-between transition-all',
        oauthNotice.type === 'success'
          ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-200'
          : 'bg-rose-950/60 border-rose-500/40 text-rose-200'
      ]"
    >
      <div class="flex items-center gap-3">
        <svg v-if="oauthNotice.type === 'success'" class="w-5 h-5 text-emerald-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <svg v-else class="w-5 h-5 text-rose-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span class="text-sm font-medium">{{ oauthNotice.message }}</span>
      </div>
      <button @click="oauthNotice = null" class="text-slate-400 hover:text-white p-1">
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>

    <!-- Connection Card -->
    <div class="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 class="text-lg font-bold text-white">Canal Conectado</h3>
          <p class="text-xs text-slate-400 mt-0.5">
            Autenticação segura via Google OAuth 2.0 com escopos oficiais de leitura.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span
            :class="[
              'inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full border font-medium',
              authStore.authState.authenticated
                ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            ]"
          >
            <span
              :class="[
                'w-2 h-2 rounded-full',
                authStore.authState.authenticated ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
              ]"
            ></span>
            <span>{{ authStore.authState.authenticated ? 'Canal Conectado' : 'Desconectado' }}</span>
          </span>
        </div>
      </div>

      <!-- Authenticated Channel View -->
      <div v-if="authStore.authState.authenticated && authStore.authState.channel" class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div class="flex items-center gap-4">
            <img
              v-if="authStore.authState.channel.channelThumbnail"
              :src="authStore.authState.channel.channelThumbnail"
              :alt="authStore.authState.channel.channelTitle || 'Canal'"
              class="w-16 h-16 rounded-2xl object-cover border border-slate-700 shadow-md"
            />
            <div v-else class="w-16 h-16 rounded-2xl bg-brand-600 flex items-center justify-center text-xl font-bold text-white shadow-md">
              {{ authStore.authState.channel.channelTitle?.charAt(0) || 'C' }}
            </div>

            <div>
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-base font-bold text-white flex items-center gap-2">
                  {{ authStore.authState.channel.channelTitle }}
                  <svg class="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                  </svg>
                </h4>
                <span
                  v-if="authStore.authState.channel.clientConfigName"
                  class="text-[11px] px-2.5 py-0.5 rounded-full bg-brand-500/10 text-brand-300 border border-brand-500/20 font-medium"
                >
                  Credencial: {{ authStore.authState.channel.clientConfigName }}
                </span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5 font-mono">
                ID do Canal: {{ authStore.authState.channel.channelId }}
              </p>
              <p v-if="authStore.authState.channel.email" class="text-xs text-slate-500 mt-0.5">
                Conta Google: {{ authStore.authState.channel.email }}
              </p>
            </div>
          </div>

          <div class="flex flex-wrap items-center gap-2">
            <button
              @click="authStore.startConnectFlow()"
              class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              Reconectar / Trocar
            </button>
            <button
              @click="handleLogout"
              class="px-4 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 text-xs font-semibold border border-rose-800/50 transition"
            >
              Desconectar
            </button>
          </div>
        </div>
      </div>

      <!-- Disconnected State Actions -->
      <div v-else class="p-6 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center max-w-lg mx-auto space-y-4">
        <div class="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 flex items-center justify-center mx-auto border border-brand-500/20">
          <svg class="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
          </svg>
        </div>
        <div>
          <h4 class="text-sm font-bold text-white">Nenhum canal conectado</h4>
          <p class="text-xs text-slate-400 mt-1">
            Conecte seu canal para permitir a sincronização de inscritos acessíveis e seus vídeos recentes.
          </p>
        </div>

        <div class="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
          <button
            @click="authStore.startConnectFlow()"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-lg shadow-brand-950/40 transition cursor-pointer"
          >
            <svg class="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
            </svg>
            <span>Conectar Canal</span>
          </button>

          <!-- Development Mock Login -->
          <a
            href="/api/auth/dev-login"
            class="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition"
          >
            <span>Canal de Teste (Dev)</span>
          </a>
        </div>
      </div>

      <!-- Scopes & Security Info -->
      <div class="pt-6 border-t border-slate-800/80 space-y-4">
        <h4 class="text-sm font-semibold text-white">Escopos Oficiais Solicitados</h4>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span class="font-mono text-brand-400 font-semibold block text-[11px]">https://www.googleapis.com/auth/youtube.readonly</span>
            <span class="text-slate-400 mt-1 block">Leitura da lista de inscritos e vídeos públicos do seu próprio canal.</span>
          </div>

          <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
            <span class="font-mono text-sky-400 font-semibold block text-[11px]">userinfo.profile & userinfo.email</span>
            <span class="text-slate-400 mt-1 block">Identificação do proprietário e do nome da conta Google autenticada.</span>
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-900/40 border border-slate-800/80 text-xs text-slate-400 space-y-1.5">
          <p class="font-semibold text-slate-300">🛡️ Garantia de Proteção de Dados:</p>
          <p>
            Tokens de acesso, atualização (refresh token) e segredos de clientes são mantidos exclusivamente no backend com criptografia AES-256-GCM.
            Nenhum token ou segredo sensível é transmitido para o navegador ou exposto em logs.
          </p>
        </div>
      </div>
    </div>

    <!-- NEW SUB-GROUP: Credenciais Google Cloud (Multi-Clientes OAuth 2.0) -->
    <div id="google-clients" class="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div class="flex items-center gap-2">
            <h3 class="text-lg font-bold text-white">Credenciais Google Cloud (OAuth 2.0)</h3>
            <span class="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20">
              Multi-Canais
            </span>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Cadastre múltiplos Client IDs, Secrets e Redirect URIs para alternar entre diferentes projetos do Google Cloud.
          </p>
        </div>

        <button
          @click="openCreateModal()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-950/30 transition cursor-pointer"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Nova Credencial</span>
        </button>
      </div>

      <!-- Clients List -->
      <div v-if="isLoadingClients" class="py-8 text-center text-xs text-slate-400">
        Carregando credenciais cadastradas...
      </div>

      <div v-else-if="clientList.length > 0" class="space-y-3">
        <div
          v-for="client in clientList"
          :key="client.id"
          class="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 hover:border-slate-700 transition space-y-3"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div class="flex items-center gap-3">
              <div class="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-brand-400 flex-shrink-0">
                <svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
                </svg>
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <h4 class="text-sm font-bold text-white">{{ client.name }}</h4>
                  <span
                    v-if="client.isDefault"
                    class="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30"
                  >
                    <svg class="w-3 h-3 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                    </svg>
                    Padrão (Conecta Direto)
                  </span>
                </div>
                <p class="text-[11px] text-slate-400 mt-0.5 font-mono">
                  Cadastrado em: {{ new Date(client.createdAt).toLocaleDateString('pt-BR') }}
                </p>
              </div>
            </div>

            <!-- Action buttons -->
            <div class="flex flex-wrap items-center gap-2">
              <button
                @click="authStore.connectWithClient(client.id)"
                class="px-3 py-1.5 rounded-xl bg-brand-600/90 hover:bg-brand-500 text-white text-xs font-semibold shadow-sm transition flex items-center gap-1.5"
                title="Iniciar login OAuth com este projeto do Google"
              >
                <span>Conectar com esta</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </button>

              <button
                v-if="!client.isDefault"
                @click="handleSetDefault(client.id)"
                class="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-medium border border-slate-700 transition flex items-center gap-1"
                title="Definir como credencial padrão para conectar direto sem perguntar"
              >
                <svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
                </svg>
                <span>Tornar Padrão</span>
              </button>

              <button
                @click="openEditModal(client)"
                class="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
                title="Editar credencial"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>

              <button
                @click="handleDeleteClient(client)"
                class="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/80 text-rose-400 border border-slate-700 hover:border-rose-800/60 transition"
                title="Excluir credencial"
              >
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                </svg>
              </button>
            </div>
          </div>

          <!-- Credential details grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5 pt-2 text-xs font-mono">
            <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div class="truncate mr-2">
                <span class="text-[10px] text-slate-500 block uppercase tracking-wider font-sans">Client ID</span>
                <span class="text-slate-300 text-[11px] truncate block" :title="client.clientId">{{ client.clientId }}</span>
              </div>
              <button
                @click="copyToClipboard(client.clientId, 'Client ID copiado!')"
                class="text-slate-500 hover:text-slate-200 p-1 flex-shrink-0"
                title="Copiar Client ID"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>

            <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div class="truncate mr-2">
                <span class="text-[10px] text-slate-500 block uppercase tracking-wider font-sans">Client Secret</span>
                <span class="text-slate-400 text-[11px] font-sans tracking-widest block">{{ client.clientSecretMasked }}</span>
              </div>
              <span class="text-[10px] text-emerald-400/80 font-sans font-medium px-2 py-0.5 rounded bg-emerald-950/40 border border-emerald-800/40">
                Criptografado
              </span>
            </div>

            <div class="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
              <div class="truncate mr-2">
                <span class="text-[10px] text-slate-500 block uppercase tracking-wider font-sans">Redirect URI</span>
                <span class="text-slate-300 text-[11px] truncate block" :title="client.redirectUri">{{ client.redirectUri }}</span>
              </div>
              <button
                @click="copyToClipboard(client.redirectUri, 'Redirect URI copiado!')"
                class="text-slate-500 hover:text-slate-200 p-1 flex-shrink-0"
                title="Copiar Redirect URI"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else class="p-8 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-center space-y-3">
        <div class="w-12 h-12 rounded-2xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto border border-slate-700">
          <svg class="w-6 h-6 text-brand-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
          </svg>
        </div>
        <h4 class="text-sm font-bold text-white">Nenhuma credencial Google Cloud cadastrada</h4>
        <p class="text-xs text-slate-400 max-w-md mx-auto">
          Cadastre suas credenciais do Google Cloud Console para poder alternar entre diferentes canais ou projetos com facilidade.
        </p>
        <button
          @click="openCreateModal()"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Cadastrar Primeira Credencial</span>
        </button>
      </div>

      <!-- Quick Setup Instructions Card -->
      <div class="p-4 rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-400 space-y-2">
        <div class="flex items-center gap-2 text-slate-300 font-semibold">
          <svg class="w-4 h-4 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Como configurar seu Google Cloud Console:</span>
        </div>
        <ol class="list-decimal list-inside space-y-1 text-slate-400 pl-1">
          <li>Acesse o <a href="https://console.cloud.google.com/apis/credentials" target="_blank" class="text-brand-400 hover:underline">Google Cloud Console &gt; APIs &amp; Services &gt; Credentials</a>.</li>
          <li>Crie ou selecione um <strong>OAuth 2.0 Client ID</strong> do tipo <em>Web Application</em>.</li>
          <li>
            Em <strong>Authorized redirect URIs</strong>, adicione exatamente:
            <code
              @click="copyToClipboard(defaultRedirectUri, 'Redirect URI copiado!')"
              title="Clique para copiar"
              class="text-emerald-400 bg-slate-950 px-1.5 py-0.5 rounded font-mono cursor-pointer hover:bg-slate-900"
            >{{ defaultRedirectUri }}</code>
          </li>
          <li>Copie o <strong>Client ID</strong> e <strong>Client Secret</strong> gerados e cadastre acima.</li>
          <li>Se marcar <strong>Definir como padrão</strong>, ao clicar em "Conectar Canal" a autenticação usará este canal automaticamente sem perguntar.</li>
        </ol>
      </div>
    </div>

    <!-- PWA & Offline Experience Card -->
    <div class="glass-card p-6 sm:p-8 rounded-3xl space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h4 class="text-sm font-semibold text-white">Progressive Web App (PWA) &amp; Cache Offline</h4>
          <p class="text-xs text-slate-400 mt-0.5">
            Instale a aplicação no Windows/Mac, Android ou iOS para ter uma experiência nativa de aplicativo.
          </p>
        </div>

        <button
          v-if="appStore.canInstallPwa"
          @click="appStore.promptInstall()"
          class="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md transition"
        >
          Instalar Aplicativo
        </button>
        <span v-else class="text-[11px] px-2.5 py-1 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
          PWA Ativo no Navegador
        </span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
        <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span class="font-semibold text-white block mb-1">Status de Conectividade</span>
          <span class="text-slate-400">
            Atualmente: <strong :class="appStore.isOnline ? 'text-emerald-400' : 'text-amber-400'">{{ appStore.isOnline ? 'Online' : 'Offline' }}</strong>.
            O Service Worker sincroniza assets e mantém a casca da aplicação pronta mesmo sem internet.
          </span>
        </div>

        <div class="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800">
          <span class="font-semibold text-white block mb-1">Privacidade do Cache Offline</span>
          <span class="text-slate-400">
            As rotas <code class="text-brand-300">/api/*</code> e credenciais nunca são armazenadas no cache offline do Service Worker para proteção total dos seus dados.
          </span>
        </div>
      </div>
    </div>

    <!-- SQLite Database Backup Card -->
    <div class="glass-card p-6 sm:p-8 rounded-3xl space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h4 class="text-sm font-semibold text-white">Banco de Dados SQLite (<code class="text-brand-300 font-mono">dev.db</code>)</h4>
          <p class="text-xs text-slate-400 mt-0.5">
            Em produção, o arquivo <code class="font-mono text-slate-300">dev.db</code> é replicado continuamente em tempo real. Você também pode baixar uma cópia íntegra e atualizada a qualquer momento.
          </p>
        </div>

        <button
          type="button"
          :disabled="isDownloadingBackup"
          @click="handleDownloadBackupDb"
          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 border border-slate-700 text-white text-xs font-semibold transition flex items-center gap-2 self-start sm:self-auto"
        >
          <span v-if="isDownloadingBackup" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
          <svg v-else class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>{{ isDownloadingBackup ? 'Gerando Snapshot...' : 'Baixar dev.db Atualizado' }}</span>
        </button>
      </div>
    </div>

    <!-- Modal Create / Edit Credential -->
    <Teleport to="body">
      <div
        v-if="isModalOpen"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm"
      >
        <div
          class="glass-card w-full max-w-xl rounded-3xl border border-slate-700/80 p-6 sm:p-8 shadow-2xl relative bg-slate-900/95 space-y-6"
        >
          <!-- Modal Header -->
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-lg font-bold text-white">
                {{ editingClientId ? 'Editar Credencial Google Cloud' : 'Nova Credencial Google Cloud' }}
              </h3>
              <p class="text-xs text-slate-400 mt-0.5">
                Preencha os dados do seu aplicativo registrado no Google Cloud Console.
              </p>
            </div>
            <button
              @click="closeModal()"
              class="text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
            >
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Form -->
          <form @submit.prevent="handleSaveClient" class="space-y-4">
            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">
                Nome / Identificador do Canal ou Projeto <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.name"
                type="text"
                required
                placeholder="Ex: Sol Nascente, Pétalas, Canal Secundário"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">
                Google Client ID <span class="text-rose-400">*</span>
              </label>
              <input
                v-model="form.clientId"
                type="text"
                required
                placeholder="Ex: 123456789-xxxxxxxx.apps.googleusercontent.com"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-brand-500"
              />
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">
                Google Client Secret
                <span v-if="!editingClientId" class="text-rose-400">*</span>
                <span v-else class="text-slate-500 font-normal"> (deixe em branco para manter o atual)</span>
              </label>
              <div class="relative">
                <input
                  v-model="form.clientSecret"
                  :type="showSecret ? 'text' : 'password'"
                  :required="!editingClientId"
                  placeholder="Ex: GOCSPX-xxxxxxxxxxxxxxxx"
                  class="w-full px-4 py-2.5 pr-10 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-brand-500"
                />
                <button
                  type="button"
                  @click="showSecret = !showSecret"
                  class="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                  title="Mostrar/Ocultar"
                >
                  <svg v-if="!showSecret" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                  <svg v-else class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                </button>
              </div>
            </div>

            <div>
              <label class="block text-xs font-semibold text-slate-300 mb-1.5">
                Redirect URI Autorizado
              </label>
              <input
                v-model="form.redirectUri"
                type="text"
                :placeholder="defaultRedirectUri"
                class="w-full px-4 py-2.5 rounded-xl bg-slate-800 border border-slate-700 text-white font-mono text-xs focus:outline-none focus:border-brand-500"
              />
              <p class="text-[11px] text-slate-400 mt-1">
                Certifique-se de que este mesmo URI está cadastrado nas credenciais do Google Cloud Console.
              </p>
            </div>

            <div class="pt-2">
              <label class="flex items-start gap-3 p-3 rounded-xl bg-slate-800/60 border border-slate-700/80 cursor-pointer hover:bg-slate-800 transition">
                <input
                  v-model="form.isDefault"
                  type="checkbox"
                  class="mt-0.5 rounded text-brand-600 focus:ring-brand-500 border-slate-700 bg-slate-900"
                />
                <div>
                  <span class="text-xs font-semibold text-white block">Definir como credencial padrão</span>
                  <span class="text-[11px] text-slate-400 block mt-0.5">
                    Ao clicar em "Conectar Canal", utilizar esta credencial diretamente sem perguntar qual canal usar.
                  </span>
                </div>
              </label>
            </div>

            <!-- Modal Action Buttons -->
            <div class="flex items-center justify-end gap-3 pt-4 border-t border-slate-800">
              <button
                type="button"
                @click="closeModal()"
                class="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                :disabled="isSaving"
                class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-brand-950/40 transition flex items-center gap-2"
              >
                <span v-if="isSaving" class="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                <span>{{ editingClientId ? 'Salvar Alterações' : 'Salvar Credencial' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useAppStore } from '../stores/app';
import { apiService } from '../services/api';
import type { GoogleClientConfigDto } from '@youtube-engagement/shared';

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const appStore = useAppStore();

const defaultRedirectUri = computed(() => {
  if (typeof window === 'undefined') {
    return 'http://localhost:3000/api/auth/google/callback';
  }
  const origin = window.location.origin;
  if (origin.includes(':5173')) {
    return 'http://localhost:3000/api/auth/google/callback';
  }
  return `${origin}/api/auth/google/callback`;
});

const oauthNotice = ref<{ type: 'success' | 'error'; message: string } | null>(null);
const isDownloadingBackup = ref(false);

// Google Clients State
const clientList = ref<GoogleClientConfigDto[]>([]);
const isLoadingClients = ref(false);
const isModalOpen = ref(false);
const editingClientId = ref<string | null>(null);
const isSaving = ref(false);
const showSecret = ref(false);

const form = ref({
  name: '',
  clientId: '',
  clientSecret: '',
  redirectUri: defaultRedirectUri.value,
  isDefault: false,
});

async function loadClients() {
  isLoadingClients.value = true;
  try {
    const list = await apiService.getGoogleClients();
    clientList.value = list;
  } catch (err: any) {
    console.error('Falha ao carregar credenciais Google:', err);
  } finally {
    isLoadingClients.value = false;
  }
}

function openCreateModal() {
  editingClientId.value = null;
  form.value = {
    name: '',
    clientId: '',
    clientSecret: '',
    redirectUri: defaultRedirectUri.value,
    isDefault: clientList.value.length === 0, // default if first
  };
  showSecret.value = false;
  isModalOpen.value = true;
}

function openEditModal(client: GoogleClientConfigDto) {
  editingClientId.value = client.id;
  form.value = {
    name: client.name,
    clientId: client.clientId,
    clientSecret: '', // blank unless updating
    redirectUri: client.redirectUri,
    isDefault: client.isDefault,
  };
  showSecret.value = false;
  isModalOpen.value = true;
}

function closeModal() {
  isModalOpen.value = false;
  editingClientId.value = null;
}

async function handleSaveClient() {
  isSaving.value = true;
  try {
    if (editingClientId.value) {
      await apiService.updateGoogleClient(editingClientId.value, {
        name: form.value.name,
        clientId: form.value.clientId,
        clientSecret: form.value.clientSecret || undefined,
        redirectUri: form.value.redirectUri,
        isDefault: form.value.isDefault,
      });
      appStore.showToast('Credencial atualizada com sucesso!', 'success');
    } else {
      await apiService.createGoogleClient({
        name: form.value.name,
        clientId: form.value.clientId,
        clientSecret: form.value.clientSecret,
        redirectUri: form.value.redirectUri,
        isDefault: form.value.isDefault,
      });
      appStore.showToast('Credencial Google Cloud cadastrada com sucesso!', 'success');
    }

    closeModal();
    await loadClients();
  } catch (err: any) {
    appStore.showToast(err.message || 'Erro ao salvar credencial.', 'error');
  } finally {
    isSaving.value = false;
  }
}

async function handleSetDefault(id: string) {
  try {
    await apiService.setDefaultGoogleClient(id);
    appStore.showToast('Credencial definida como padrão para conexão!', 'success');
    await loadClients();
  } catch (err: any) {
    appStore.showToast(err.message || 'Erro ao definir credencial como padrão.', 'error');
  }
}

async function handleDeleteClient(client: GoogleClientConfigDto) {
  if (!confirm(`Tem certeza que deseja excluir as credenciais de "${client.name}"?`)) {
    return;
  }

  try {
    await apiService.deleteGoogleClient(client.id);
    appStore.showToast(`Credencial "${client.name}" excluída.`, 'success');
    await loadClients();
  } catch (err: any) {
    appStore.showToast(err.message || 'Erro ao excluir credencial.', 'error');
  }
}

function copyToClipboard(text: string, msg: string) {
  navigator.clipboard.writeText(text);
  appStore.showToast(msg, 'success');
}

async function handleDownloadBackupDb() {
  isDownloadingBackup.value = true;
  try {
    const response = await fetch('/api/health/backup-db', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      const errBody = await response.json().catch(() => ({}));
      throw new Error(
        errBody.message || 'Conecte um canal autenticado antes de baixar o dev.db.',
      );
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'dev.db';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);

    appStore.showToast('Arquivo dev.db atualizado baixado com sucesso!', 'success');
  } catch (err: any) {
    appStore.showToast(err.message || 'Falha ao baixar o arquivo dev.db.', 'error');
  } finally {
    isDownloadingBackup.value = false;
  }
}

async function handleLogout() {
  await authStore.logout();
  oauthNotice.value = {
    type: 'success',
    message: 'Sessão encerrada com sucesso.',
  };
}

onMounted(async () => {
  await authStore.checkAuth();
  await loadClients();

  // Process OAuth feedback parameters in URL
  if (route.query.oauth === 'success') {
    oauthNotice.value = {
      type: 'success',
      message: 'Canal do YouTube conectado com sucesso via Google OAuth!',
    };
    router.replace({ query: {} });
  } else if (route.query.oauth === 'dev_success') {
    oauthNotice.value = {
      type: 'success',
      message: 'Sessão iniciada com sucesso usando o Canal de Demonstração (Dev)!',
    };
    router.replace({ query: {} });
  } else if (route.query.oauth === 'error') {
    oauthNotice.value = {
      type: 'error',
      message: (route.query.message as string) || 'Falha ao autenticar com o Google.',
    };
    router.replace({ query: {} });
  }
});
</script>
