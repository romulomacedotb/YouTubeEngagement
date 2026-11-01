<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Inscritos & Canais</h1>
        <p class="text-sm text-slate-400">
          Gerencie inscritos, acompanhe o status de engajamento e envie comentários e curtidas nos vídeos mais recentes.
        </p>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <button
          @click="startVideosSync"
          :disabled="isSyncingVideos || isSyncing"
          class="inline-flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white font-medium text-xs border border-slate-700 transition"
        >
          <svg v-if="!isSyncingVideos" class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin text-emerald-400" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{{ isSyncingVideos ? 'Buscando Vídeos...' : 'Buscar Vídeos Recentes' }}</span>
        </button>

        <button
          @click="startSync"
          :disabled="isSyncing"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium text-xs transition shadow-md shadow-brand-950/40"
        >
          <svg v-if="!isSyncing" class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <svg v-else class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
          </svg>
          <span>{{ isSyncing ? 'Sincronizando...' : 'Sincronizar Inscritos' }}</span>
        </button>

        <button
          @click="loadChannels"
          :disabled="isLoading"
          class="px-3 py-2.5 rounded-xl bg-slate-850 hover:bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 transition"
          title="Recarregar lista"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        </button>
      </div>
    </div>

    <!-- Filters, Status Filter & Sorter Bar -->
    <div class="glass-card p-4 rounded-2xl flex flex-col lg:flex-row gap-3 items-center justify-between">
      <div class="w-full lg:w-72 relative">
        <input
          v-model="searchQuery"
          @input="onSearch"
          type="text"
          placeholder="Pesquisar por título ou @handle..."
          class="w-full bg-slate-900/80 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand-500"
        />
      </div>

      <div class="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-end">
        <!-- Interaction Status Filter -->
        <select
          v-model="engagementFilter"
          @change="onFilterChange"
          class="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-brand-500 font-medium"
        >
          <option value="all">🔍 Todos os Status</option>
          <option value="incomplete">🎯 Falta comentar ou curtir</option>
          <option value="pending">⏳ Nem comentados nem curtidos</option>
          <option value="not_commented">💬 Ainda não comentados</option>
          <option value="not_liked">🤍 Ainda não curtidos</option>
          <option value="failed">❌ Com erro (ex.: quota)</option>
          <option value="commented">💬 Já Comentados</option>
          <option value="liked">❤️ Já Curtidos</option>
          <option value="both">✨ Comentados &amp; Curtidos</option>
        </select>

        <!-- Sorter -->
        <select
          v-model="sortBy"
          @change="loadChannels"
          class="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500"
        >
          <option value="lastSyncedAt">Mais recentes sincronizados</option>
          <option value="subscriberCount">Mais inscritos</option>
          <option value="videoCount">Mais vídeos publicados</option>
          <option value="title">Nome (A-Z)</option>
          <option value="createdAt">Data de inclusão</option>
        </select>

        <!-- Page Size Selector -->
        <select
          v-model="pageSize"
          @change="onPageSizeChange"
          class="bg-slate-900/80 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-brand-500 font-medium"
          title="Quantidade de canais por página"
        >
          <option :value="12">12 por página</option>
          <option :value="24">24 por página</option>
          <option :value="48">48 por página</option>
          <option :value="100">100 por página</option>
          <option :value="-1">Todos (sem paginação)</option>
        </select>

        <!-- Filter: Only with video -->
        <label class="inline-flex items-center gap-2 text-xs text-slate-300 cursor-pointer bg-slate-900/60 px-3 py-2 rounded-xl border border-slate-800">
          <input
            type="checkbox"
            v-model="hasVideoOnly"
            @change="loadChannels"
            class="rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-900"
          />
          <span>Com vídeo recente</span>
        </label>
      </div>
    </div>

    <!-- Multi-Selection Action Toolbar -->
    <div
      v-if="channels.length > 0"
      class="p-3 rounded-2xl bg-slate-900/60 border border-slate-800/80 flex flex-wrap items-center justify-between gap-3 text-xs"
    >
      <div class="flex flex-wrap items-center gap-3">
        <label class="inline-flex items-center gap-2 cursor-pointer text-slate-300 font-semibold select-none">
          <input
            type="checkbox"
            :checked="isAllSelected"
            @change="toggleSelectAll"
            class="w-4 h-4 rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-900 cursor-pointer"
          />
          <span>{{ pageSize === -1 ? `Selecionar todos os canais (${channels.length})` : `Selecionar todos da página (${channels.length})` }}</span>
        </label>

        <!-- Shortcut to load and select all channels across all pages -->
        <button
          v-if="pageSize !== -1 && totalChannels > channels.length"
          @click="selectAllAcrossAllPages"
          class="text-[11px] text-brand-400 hover:text-brand-300 underline font-medium"
        >
          Carregar e selecionar todos os {{ totalChannels }} canais
        </button>

        <span
          v-if="selectedChannelIds.length > 0"
          class="px-2.5 py-0.5 rounded-full bg-brand-500/20 text-brand-300 border border-brand-500/30 text-[11px] font-bold"
        >
          {{ selectedChannelIds.length }} selecionado(s)
        </span>
      </div>

      <div class="flex items-center gap-2">
        <button
          v-if="selectedChannelIds.length > 0"
          @click="clearSelection"
          class="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs transition"
        >
          Desmarcar todos
        </button>

        <button
          v-if="selectedChannelIds.length > 0"
          @click="openBatchModal"
          class="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-md shadow-brand-950/40 transition"
        >
          <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span>Comentar & Curtir Selecionados ({{ selectedChannelIds.length }})</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-16 text-center text-slate-400">
      <div class="inline-block animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-3"></div>
      <p class="text-xs">Carregando canais e dados de engajamento...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="errorMessage" class="glass-card p-12 text-center rounded-2xl border border-rose-900/50">
      <div class="w-14 h-14 mx-auto mb-3 rounded-2xl bg-rose-950/60 flex items-center justify-center text-rose-400">
        ✕
      </div>
      <h3 class="text-base font-bold text-white">Falha ao carregar canais</h3>
      <p class="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">{{ errorMessage }}</p>
      <button
        @click="loadChannels"
        class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
      >
        Tentar Novamente
      </button>
    </div>

    <!-- Empty State -->
    <div v-else-if="channels.length === 0" class="glass-card p-12 text-center rounded-2xl">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-white">Nenhum inscrito encontrado com os filtros atuais</h3>
      <p class="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
        {{ engagementFilter !== 'all' ? 'Tente mudar o filtro de status para "Todos os Status" ou redefinir a busca.' : 'Clique em "Sincronizar Inscritos" acima para buscar os inscritos acessíveis do canal conectado.' }}
      </p>
      <div class="flex items-center justify-center gap-3">
        <button
          v-if="engagementFilter !== 'all'"
          @click="resetFilters"
          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
        >
          Limpar Filtros
        </button>
        <button
          @click="startSync"
          :disabled="isSyncing"
          class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs transition"
        >
          Sincronizar Inscritos Agora
        </button>
      </div>
    </div>

    <!-- Channels List Grid -->
    <div v-else class="space-y-4">
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          v-for="ch in channels"
          :key="ch.id"
          class="glass-card p-5 rounded-2xl flex flex-col justify-between transition group relative"
          :class="selectedChannelIds.includes(ch.id) ? 'border-brand-500/80 bg-brand-950/20 ring-1 ring-brand-500/40 shadow-lg shadow-brand-950/30' : 'hover:border-slate-600/50'"
        >
          <div>
            <!-- Channel Info Header + Checkbox -->
            <div class="flex items-start gap-3">
              <input
                type="checkbox"
                :value="ch.id"
                v-model="selectedChannelIds"
                class="mt-1 w-4 h-4 rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-900 cursor-pointer flex-shrink-0"
              />

              <img
                v-if="ch.thumbnailUrl"
                :src="ch.thumbnailUrl"
                :alt="ch.title"
                class="w-12 h-12 rounded-2xl object-cover border border-slate-700 flex-shrink-0 group-hover:scale-105 transition-transform"
              />
              <div v-else class="w-12 h-12 rounded-2xl bg-brand-600 flex items-center justify-center text-slate-100 font-bold flex-shrink-0">
                {{ ch.title.charAt(0) }}
              </div>

              <div class="min-w-0 flex-1">
                <h4
                  class="text-sm font-bold text-white truncate cursor-pointer hover:text-brand-400"
                  @click="openChannelDetails(ch)"
                >
                  {{ ch.title }}
                </h4>
                <p class="text-xs text-slate-400 truncate mt-0.5">
                  {{ ch.customUrl || ch.youtubeChannelId }}
                </p>
              </div>
            </div>

            <!-- Visual Interaction Status Badges (User requested: Indicar se já comentei ou curti) -->
            <div class="mt-3 flex flex-wrap items-center gap-1.5">
              <!-- Both commented & liked -->
              <span
                v-if="ch.hasCommented && ch.hasLiked"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-gradient-to-r from-emerald-500/20 to-rose-500/20 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold"
                title="Você já comentou e curtiu o último vídeo deste canal"
              >
                <span>✨</span>
                <span>Comentado & Curtido</span>
              </span>

              <!-- Only commented -->
              <span
                v-else-if="ch.hasCommented"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[11px] font-semibold"
                title="Você já publicou comentário no último vídeo deste canal"
              >
                <span>💬</span>
                <span>Comentado</span>
              </span>

              <!-- Only liked -->
              <span
                v-else-if="ch.hasLiked"
                class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30 text-[11px] font-semibold"
                title="Você já curtiu o último vídeo deste canal"
              >
                <span>❤️</span>
                <span>Curtido</span>
              </span>

              <!-- Pending / Not yet interacted -->
              <span
                v-else
                class="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-800 text-slate-400 border border-slate-700/60 text-[11px] font-medium"
                title="Ainda não interagido"
              >
                <span>⏳</span>
                <span>Pendente</span>
              </span>

              <!-- Last failure (e.g. quota exceeded) — never counted as commented/liked -->
              <span
                v-if="ch.lastEngagementError"
                class="inline-flex items-center gap-1 max-w-full px-2.5 py-0.5 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-700/60 text-[11px] font-semibold"
                :title="`${ch.lastEngagementError}${ch.lastEngagementErrorAt ? ' — ' + formatDate(ch.lastEngagementErrorAt) : ''}`"
              >
                <span>❌</span>
                <span class="truncate">Erro: {{ shortError(ch.lastEngagementError) }}</span>
              </span>

              <!-- Stats pills -->
              <span v-if="ch.subscriberCount !== null && ch.subscriberCount !== undefined" class="px-2 py-0.5 rounded-lg bg-slate-850 text-slate-400 border border-slate-800 text-[10px]">
                {{ formatNumber(ch.subscriberCount) }} subs
              </span>
            </div>

            <!-- Latest Public Video Card -->
            <div v-if="ch.latestVideo" class="mt-3.5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
              <div class="flex items-center justify-between">
                <span class="text-[10px] font-bold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                  <span class="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
                  Último Vídeo Público
                </span>
                <span class="text-[10px] text-slate-500">
                  {{ formatRelativeDate(ch.latestVideo.publishedAt) }}
                </span>
              </div>

              <div class="flex items-start gap-2.5">
                <img
                  v-if="ch.latestVideo.thumbnailUrl"
                  :src="ch.latestVideo.thumbnailUrl"
                  :alt="ch.latestVideo.title"
                  class="w-16 h-10 object-cover rounded-lg border border-slate-800 flex-shrink-0"
                />
                <div class="min-w-0 flex-1">
                  <p class="text-xs font-semibold text-white line-clamp-2 leading-tight">
                    {{ ch.latestVideo.title }}
                  </p>
                </div>
              </div>

              <div class="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px]">
                <div class="flex items-center gap-2 text-slate-400 text-[10px]">
                  <span v-if="ch.latestVideo.viewCount">{{ formatNumber(ch.latestVideo.viewCount) }} views</span>
                  <span v-if="ch.latestVideo.likeCount">• {{ formatNumber(ch.latestVideo.likeCount) }} likes</span>
                </div>

                <a
                  :href="ch.latestVideo.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-medium"
                >
                  <span>Assistir</span>
                  <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            <!-- Empty Video Fallback -->
            <div v-else class="mt-3.5 p-3 rounded-xl bg-slate-900/40 border border-dashed border-slate-800 flex items-center justify-between text-xs text-slate-500">
              <span>Sem vídeo recente salvo</span>
              <button
                @click="syncSingleVideo(ch.id)"
                :disabled="syncingVideoChannelId === ch.id"
                class="text-sky-400 hover:text-sky-300 text-[11px] font-medium"
              >
                {{ syncingVideoChannelId === ch.id ? 'Buscando...' : 'Buscar Vídeo' }}
              </button>
            </div>
          </div>

          <!-- Card Actions & Last Interaction Date -->
          <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span v-if="ch.lastEngagementDate" class="text-[10px] text-slate-500">
              Interação: {{ formatRelativeDate(ch.lastEngagementDate) }}
            </span>
            <span v-else class="text-[10px] text-slate-500">
              Sincronizado: {{ formatDate(ch.lastSyncedAt) }}
            </span>

            <div class="flex items-center gap-1.5">
              <button
                @click="openChannelDetails(ch)"
                title="Ver detalhes e engajar individualmente"
                class="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              >
                Detalhes
              </button>

              <button
                @click="syncSingleVideo(ch.id)"
                :disabled="syncingVideoChannelId === ch.id"
                title="Atualizar último vídeo deste canal"
                class="p-1.5 rounded-lg text-slate-400 hover:text-sky-400 hover:bg-slate-800 transition"
              >
                <svg
                  class="w-3.5 h-3.5"
                  :class="syncingVideoChannelId === ch.id ? 'animate-spin text-sky-400' : ''"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              <a
                :href="`https://www.youtube.com/channel/${ch.youtubeChannelId}`"
                target="_blank"
                rel="noopener noreferrer"
                class="p-1.5 rounded-lg text-slate-400 hover:text-brand-400 hover:bg-slate-800 transition"
                title="Abrir canal no YouTube"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      <!-- Pagination Footer -->
      <div class="glass-card p-4 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
        <div class="flex flex-wrap items-center gap-3">
          <div>
            <span v-if="pageSize === -1">
              Exibindo <strong>todos os {{ totalChannels }}</strong> canais
            </span>
            <span v-else>
              Exibindo <strong>{{ channels.length }}</strong> de <strong>{{ totalChannels }}</strong> canais
            </span>
          </div>

          <div class="flex items-center gap-1.5 pl-3 border-l border-slate-800">
            <span>Exibir:</span>
            <select
              v-model="pageSize"
              @change="onPageSizeChange"
              class="bg-slate-900 border border-slate-700/80 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-brand-500"
            >
              <option :value="12">12</option>
              <option :value="24">24</option>
              <option :value="48">48</option>
              <option :value="100">100</option>
              <option :value="-1">Todos</option>
            </select>
          </div>
        </div>

        <div v-if="pageSize !== -1 && totalPages > 1" class="flex items-center gap-2">
          <button
            @click="changePage(currentPage - 1)"
            :disabled="currentPage <= 1 || isLoading"
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
          >
            Anterior
          </button>
          <span>Página {{ currentPage }} de {{ totalPages }}</span>
          <button
            @click="changePage(currentPage + 1)"
            :disabled="currentPage >= totalPages || isLoading"
            class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-200 transition"
          >
            Próxima
          </button>
        </div>
      </div>
    </div>

    <!-- Floating Batch Dock Bar (Appears when >= 1 channels selected) -->
    <transition
      enter-active-class="transition duration-300 ease-out"
      enter-from-class="transform translate-y-20 opacity-0"
      enter-to-class="transform translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in"
      leave-from-class="transform translate-y-0 opacity-100"
      leave-to-class="transform translate-y-20 opacity-0"
    >
      <div
        v-if="selectedChannelIds.length > 0"
        class="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 max-w-xl w-[92%] p-3.5 rounded-2xl bg-slate-900/95 backdrop-blur-xl border border-brand-500/50 shadow-2xl shadow-brand-950/80 flex items-center justify-between gap-4"
      >
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-xl bg-brand-600/30 border border-brand-500/50 flex items-center justify-center text-brand-300 font-bold text-sm">
            {{ selectedChannelIds.length }}
          </div>
          <div>
            <p class="text-xs font-bold text-white">{{ selectedChannelIds.length }} {{ selectedChannelIds.length === 1 ? 'canal selecionado' : 'canais selecionados' }}</p>
            <p class="text-[11px] text-slate-400">Pronto para comentar e curtir os últimos vídeos</p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="clearSelection"
            class="px-3 py-2 rounded-xl text-xs text-slate-400 hover:text-white transition"
          >
            Desmarcar
          </button>

          <button
            @click="openBatchModal"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-950/50 transition"
          >
            <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span>Comentar & Curtir</span>
          </button>
        </div>
      </div>
    </transition>

    <!-- Batch Engagement Modal -->
    <div
      v-if="isBatchModalOpen"
      class="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="glass-panel w-full max-w-2xl p-6 sm:p-7 rounded-3xl border border-slate-700 space-y-5 my-8 max-h-[92vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex items-start justify-between border-b border-slate-800 pb-4">
          <div class="flex items-center gap-3">
            <div class="w-10 h-10 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-brand-950/40">
              <svg class="w-5 h-5 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <h3 class="text-base font-bold text-white">Engajamento em Lote com Vídeos Recentes</h3>
              <p class="text-xs text-slate-400">
                Interagir simultaneamente com {{ selectedChannelIds.length }} canal(is) selecionado(s).
              </p>
            </div>
          </div>

          <button
            @click="closeBatchModal"
            :disabled="isExecutingBatch"
            class="p-1.5 text-slate-400 hover:text-white rounded-xl disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        <!-- Execution Progress / Results View (if running or completed) -->
        <div v-if="isExecutingBatch || batchResult" class="space-y-4">
          <!-- Progress bar while executing -->
          <div v-if="isExecutingBatch" class="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-white flex items-center gap-2">
                <span class="w-2.5 h-2.5 rounded-full bg-brand-500 animate-ping"></span>
                Processando engajamento nos vídeos...
              </span>
              <span class="text-brand-400">
                {{ batchExecutionProgress.current }} / {{ batchExecutionProgress.total }}
              </span>
            </div>

            <div class="w-full bg-slate-800 rounded-full h-2.5 overflow-hidden">
              <div
                class="bg-gradient-to-r from-brand-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                :style="{ width: `${(batchExecutionProgress.current / Math.max(1, batchExecutionProgress.total)) * 100}%` }"
              ></div>
            </div>
            <p class="text-[11px] text-slate-400">
              Postando comentários e curtindo respeitando os limites da API do YouTube...
            </p>
          </div>

          <!-- Summary banner after completion -->
          <div v-if="batchResult" class="p-4 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <div class="flex items-center gap-2 text-emerald-400 font-bold text-sm">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>Engajamento em Lote Concluído!</span>
            </div>

            <!-- Quota Exceeded Alert Banner -->
            <div
              v-if="batchResult.quotaExceeded || batchResult.quotaMessage"
              class="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5"
            >
              <svg class="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p class="font-bold text-amber-300">Limite de Quota da YouTube Data API Atingido</p>
                <p class="text-[11px] text-amber-200/90 mt-0.5">
                  {{ batchResult.quotaMessage || 'A quota diária da API do YouTube foi esgotada. Os canais restantes não foram alterados para evitar chamadas adicionais e serão renovados à meia-noite (horário do Pacífico).' }}
                </p>
              </div>
            </div>

            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center">
              <div class="p-2.5 rounded-xl bg-slate-850 border border-slate-800">
                <p class="text-xs text-slate-400">Processados</p>
                <p class="text-base font-bold text-white">{{ batchResult.totalProcessed }}</p>
              </div>
              <div class="p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-800/40">
                <p class="text-xs text-emerald-400">Sucesso</p>
                <p class="text-base font-bold text-emerald-300">{{ batchResult.successCount }}</p>
              </div>
              <div class="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/40">
                <p class="text-xs text-amber-400">Pulados (já feitos)</p>
                <p class="text-base font-bold text-amber-300">{{ batchResult.skippedCount }}</p>
              </div>
              <div class="p-2.5 rounded-xl bg-rose-950/40 border border-rose-800/40">
                <p class="text-xs text-rose-400">Erros</p>
                <p class="text-base font-bold text-rose-300">{{ batchResult.errorCount }}</p>
              </div>
            </div>

            <!-- Detailed per-channel results list -->
            <div class="max-h-56 overflow-y-auto space-y-2 pt-2 border-t border-slate-800">
              <div
                v-for="r in batchResult.results"
                :key="r.channelId"
                class="p-2.5 rounded-xl bg-slate-850 border border-slate-800 flex items-center justify-between text-xs"
              >
                <div class="min-w-0 flex-1">
                  <p class="font-bold text-white truncate">{{ r.channelTitle }}</p>
                  <p v-if="r.videoTitle" class="text-[11px] text-slate-400 truncate">{{ r.videoTitle }}</p>
                  <p v-if="r.skipReason" class="text-[10px] text-amber-400 font-medium">{{ r.skipReason }}</p>
                  <p v-if="r.error" class="text-[10px] text-rose-400 font-medium">{{ r.error }}</p>
                </div>

                <div class="flex items-center gap-2 flex-shrink-0 ml-3">
                  <span v-if="r.commentSent" class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                    💬 Comentou
                  </span>
                  <span v-if="r.liked" class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 text-[10px] font-bold">
                    ❤️ Curtiu
                  </span>
                  <span v-if="r.skipped" class="px-2 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                    ⏭️ Pulado
                  </span>
                  <span v-if="r.error" class="px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 text-[10px]">
                    ❌ Falha
                  </span>
                </div>
              </div>
            </div>

            <div class="pt-2 flex justify-end">
              <button
                @click="finishBatchAndRefresh"
                class="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs transition shadow-md"
              >
                Concluir e Atualizar Canais
              </button>
            </div>
          </div>
        </div>

        <!-- Configuration Form (before execution) -->
        <div v-else class="space-y-4">
          <!-- Action Types Selection -->
          <div class="space-y-2">
            <label class="block text-xs font-bold text-white uppercase tracking-wider">
              Ações a Executar no Último Vídeo
            </label>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                class="p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 select-none"
                :class="batchActionTypes.includes('COMMENT') ? 'border-brand-500/80 bg-brand-950/30' : 'border-slate-800 bg-slate-900/60'"
              >
                <input
                  type="checkbox"
                  value="COMMENT"
                  v-model="batchActionTypes"
                  class="w-4 h-4 rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-900"
                />
                <div>
                  <span class="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>💬</span> Publicar Comentário
                  </span>
                  <p class="text-[11px] text-slate-400">Envia o comentário personalizado no vídeo recente</p>
                </div>
              </label>

              <label
                class="p-3 rounded-xl border cursor-pointer transition flex items-center gap-3 select-none"
                :class="batchActionTypes.includes('LIKE') ? 'border-rose-500/80 bg-rose-950/20' : 'border-slate-800 bg-slate-900/60'"
              >
                <input
                  type="checkbox"
                  value="LIKE"
                  v-model="batchActionTypes"
                  class="w-4 h-4 rounded border-slate-700 text-rose-600 focus:ring-rose-500 bg-slate-900"
                />
                <div>
                  <span class="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>❤️</span> Curtir o Vídeo (Like)
                  </span>
                  <p class="text-[11px] text-slate-400">Registra a curtida oficial via YouTube API</p>
                </div>
              </label>
            </div>
          </div>

          <!-- Anti-Duplication Safety Toggle -->
          <div class="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-start gap-3">
            <input
              type="checkbox"
              id="skipInteracted"
              v-model="batchSkipAlreadyInteracted"
              class="mt-0.5 w-4 h-4 rounded border-slate-700 text-brand-600 focus:ring-brand-500 bg-slate-900 cursor-pointer"
            />
            <label for="skipInteracted" class="text-xs cursor-pointer select-none">
              <span class="font-bold text-white flex items-center gap-1.5">
                <span>🛡️</span> Pular vídeos que já foram interagidos (Recomendado)
              </span>
              <p class="text-[11px] text-slate-400 mt-0.5">
                Evita duplicidade e spam caso você já tenha comentado ou curtido o vídeo do inscrito anteriormente.
              </p>
            </label>
          </div>

          <!-- Comment Template & Text Configuration (Shown if COMMENT is enabled) -->
          <div v-if="batchActionTypes.includes('COMMENT')" class="space-y-3 pt-2 border-t border-slate-800">
            <div class="flex items-center justify-between">
              <label class="block text-xs font-bold text-white uppercase tracking-wider">
                Conteúdo do Comentário
              </label>
              <span class="text-[10px] text-slate-400">Variáveis dinâmicas suportadas</span>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Selecionar Modelo Padrão</label>
              <select
                v-model="batchTemplateId"
                @change="applyBatchTemplate"
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Personalizado / Digitar manual --</option>
                <option v-for="tpl in availableTemplates" :key="tpl.id" :value="tpl.id">
                  {{ tpl.name }} ({{ tpl.category || 'Geral' }})
                </option>
              </select>
            </div>

            <div>
              <div class="flex items-center justify-between mb-1">
                <label class="block text-[11px] font-semibold text-slate-400">Texto do Comentário Padrão</label>
                <div class="flex items-center gap-1 text-[10px] text-brand-400 font-mono">
                  <span class="cursor-pointer hover:underline" @click="insertBatchVar('{nome_canal}')">{nome_canal}</span>
                  <span>•</span>
                  <span class="cursor-pointer hover:underline" @click="insertBatchVar('{titulo_video}')">{titulo_video}</span>
                </div>
              </div>
              <textarea
                v-model="batchCommentText"
                rows="3"
                placeholder="Exemplo: Olá {nome_canal}! Parabéns pelo conteúdo no vídeo {titulo_video} 👏"
                class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              ></textarea>
            </div>
          </div>

          <!-- Selected Channels Preview Accordion -->
          <div class="space-y-1.5 pt-2 border-t border-slate-800">
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="font-semibold text-white">Canais a serem engajados ({{ selectedChannelsList.length }})</span>
              <span>{{ selectedChannelsWithVideoCount }} com vídeo recente pronto</span>
            </div>

            <div class="max-h-36 overflow-y-auto space-y-1.5 p-2 rounded-xl bg-slate-900/60 border border-slate-800">
              <div
                v-for="ch in selectedChannelsList"
                :key="ch.id"
                class="flex items-center justify-between text-xs text-slate-300 py-1 px-2 rounded-lg bg-slate-850/60"
              >
                <div class="flex items-center gap-2 truncate">
                  <span class="text-white font-medium truncate">{{ ch.title }}</span>
                  <span v-if="ch.hasCommented || ch.hasLiked" class="text-[10px] text-amber-400 flex items-center gap-0.5">
                    <span v-if="ch.hasCommented">💬</span>
                    <span v-if="ch.hasLiked">❤️</span>
                  </span>
                </div>

                <div class="text-[11px] text-slate-400 flex-shrink-0 ml-2">
                  <span v-if="ch.latestVideo" class="text-emerald-400 font-medium">✓ Vídeo pronto</span>
                  <span v-else class="text-amber-400">Sem vídeo recente</span>
                </div>
              </div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              @click="closeBatchModal"
              class="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
            >
              Cancelar
            </button>

            <button
              @click="executeBatchEngagement"
              :disabled="batchActionTypes.length === 0 || (batchActionTypes.includes('COMMENT') && !batchCommentText.trim())"
              class="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-brand-950/50 transition"
            >
              <svg class="w-4 h-4 text-amber-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <span>Confirmar & Executar em Lote</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Individual Channel Details & Engagement Modal -->
    <div
      v-if="selectedChannel"
      class="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto"
    >
      <div class="glass-panel w-full max-w-2xl p-6 sm:p-7 rounded-3xl border border-slate-700 space-y-5 my-8 max-h-[90vh] overflow-y-auto">
        <!-- Modal Header -->
        <div class="flex items-start justify-between border-b border-slate-800 pb-4">
          <div class="flex items-center gap-3.5">
            <img
              v-if="selectedChannel.thumbnailUrl"
              :src="selectedChannel.thumbnailUrl"
              :alt="selectedChannel.title"
              class="w-14 h-14 rounded-2xl object-cover border border-slate-700"
            />
            <div v-else class="w-14 h-14 rounded-2xl bg-brand-600 flex items-center justify-center text-white font-bold text-lg">
              {{ selectedChannel.title.charAt(0) }}
            </div>

            <div>
              <h3 class="text-lg font-bold text-white">{{ selectedChannel.title }}</h3>
              <p class="text-xs text-slate-400">{{ selectedChannel.customUrl || selectedChannel.youtubeChannelId }}</p>
              <div class="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                <span v-if="selectedChannel.subscriberCount">{{ formatNumber(selectedChannel.subscriberCount) }} inscritos</span>
                <span v-if="selectedChannel.videoCount">• {{ selectedChannel.videoCount }} vídeos</span>
              </div>
            </div>
          </div>

          <button @click="selectedChannel = null" class="p-1 text-slate-400 hover:text-white rounded-lg">
            ✕
          </button>
        </div>

        <!-- Latest Video Preview Section -->
        <div v-if="selectedChannel.latestVideo" class="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-3">
          <div class="flex items-center justify-between">
            <span class="text-xs font-bold text-rose-400 flex items-center gap-2">
              <span class="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
              Vídeo Recente para Engajamento
            </span>
            <span class="text-xs text-slate-500">
              {{ formatDate(selectedChannel.latestVideo.publishedAt) }}
            </span>
          </div>

          <div class="flex flex-col sm:flex-row gap-3">
            <img
              v-if="selectedChannel.latestVideo.thumbnailUrl"
              :src="selectedChannel.latestVideo.thumbnailUrl"
              :alt="selectedChannel.latestVideo.title"
              class="w-full sm:w-44 h-24 object-cover rounded-xl border border-slate-800"
            />
            <div class="min-w-0 flex-1 space-y-1.5">
              <h5 class="text-sm font-semibold text-white leading-snug">
                {{ selectedChannel.latestVideo.title }}
              </h5>
              <p class="text-[11px] text-slate-400 font-mono truncate">
                ID do Vídeo: {{ selectedChannel.latestVideo.youtubeVideoId }}
              </p>
              <div class="flex items-center gap-3 text-xs text-slate-400 pt-1">
                <span v-if="selectedChannel.latestVideo.viewCount">{{ formatNumber(selectedChannel.latestVideo.viewCount) }} views</span>
                <span v-if="selectedChannel.latestVideo.likeCount">• {{ formatNumber(selectedChannel.latestVideo.likeCount) }} likes</span>
                <a
                  :href="selectedChannel.latestVideo.url"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="ml-auto inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                >
                  <span>Abrir Vídeo</span>
                  <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        <div v-else class="p-4 rounded-xl bg-slate-900/50 border border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>Este canal ainda não possui vídeo recente sincronizado.</span>
          <button
            @click="syncSingleVideo(selectedChannel.id)"
            :disabled="syncingVideoChannelId === selectedChannel.id"
            class="px-3 py-1.5 rounded-lg bg-sky-600/20 text-sky-400 hover:bg-sky-600/30 font-medium"
          >
            {{ syncingVideoChannelId === selectedChannel.id ? 'Buscando...' : 'Buscar Agora' }}
          </button>
        </div>

        <!-- Interactive Engagement Preparation Section -->
        <div class="space-y-3 pt-2 border-t border-slate-800">
          <div class="flex items-center justify-between">
            <h4 class="text-xs font-bold uppercase tracking-wider text-white">Preparar Comentário Personalizado</h4>
            <span class="text-[10px] text-brand-400 font-semibold">Envio Automático ou Cópia</span>
          </div>

          <!-- Notice if recent interaction exists -->
          <div
            v-if="recentActionNotice"
            class="p-3 rounded-xl bg-amber-950/50 border border-amber-600/40 text-amber-200 text-xs flex items-center gap-2"
          >
            <span>⚠️</span>
            <span>{{ recentActionNotice }}</span>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Selecionar Modelo de Comentário</label>
              <select
                v-model="selectedTemplateId"
                @change="applySelectedTemplate"
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">-- Personalizado / Manual --</option>
                <option v-for="tpl in availableTemplates" :key="tpl.id" :value="tpl.id">
                  {{ tpl.name }} ({{ tpl.category || 'Geral' }})
                </option>
              </select>
            </div>

            <div>
              <label class="block text-[11px] font-semibold text-slate-400 mb-1">Assunto / Tópico Especial</label>
              <input
                v-model="customAssunto"
                @input="applySelectedTemplate"
                type="text"
                placeholder="Ex: seu tutorial de programação"
                class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>

          <div>
            <label class="block text-[11px] font-semibold text-slate-400 mb-1">Texto Final do Comentário</label>
            <textarea
              v-model="customCommentText"
              rows="3"
              class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 font-sans"
              placeholder="Digite ou selecione um modelo de comentário acima..."
            ></textarea>
          </div>

          <!-- Action Buttons -->
          <div class="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
            <div class="flex items-center gap-2">
              <button
                @click="copyComment"
                :disabled="!customCommentText || isRecordingAction"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold border border-slate-700 transition"
              >
                <span>📋 Copiar Texto</span>
              </button>

              <button
                v-if="selectedChannel.latestVideo"
                @click="singleLikeVideo(selectedChannel)"
                :disabled="isRecordingAction"
                class="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 text-xs font-semibold border border-rose-800/60 transition"
              >
                <span>❤️ Curtir Vídeo</span>
              </button>
            </div>

            <button
              v-if="selectedChannel.latestVideo"
              @click="singleCommentAndLike(selectedChannel)"
              :disabled="isRecordingAction || !customCommentText"
              class="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-950/40 transition"
            >
              <span>⚡ Enviar Comentário & Like</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type {
  ChannelSummary,
  CommentTemplateDto,
  BatchEngagementResult,
} from '@youtube-engagement/shared';
import { apiService } from '../services/api';
import { useAppStore } from '../stores/app';

const appStore = useAppStore();

const channels = ref<ChannelSummary[]>([]);
const isLoading = ref(false);
const errorMessage = ref<string | null>(null);
const isSyncing = ref(false);
const isSyncingVideos = ref(false);
const syncingChannelId = ref<string | null>(null);
const syncingVideoChannelId = ref<string | null>(null);

const searchQuery = ref('');
const sortBy = ref('lastSyncedAt');
const hasVideoOnly = ref(false);
const engagementFilter = ref<
  | 'all'
  | 'pending'
  | 'incomplete'
  | 'not_commented'
  | 'not_liked'
  | 'commented'
  | 'liked'
  | 'both'
  | 'failed'
>('all');
const pageSize = ref<number>(12);
const currentPage = ref(1);
const totalPages = ref(1);
const totalChannels = ref(0);

// Multi-selection state
const selectedChannelIds = ref<string[]>([]);

// Batch Engagement state
const isBatchModalOpen = ref(false);
const batchActionTypes = ref<('COMMENT' | 'LIKE')[]>(['COMMENT', 'LIKE']);
const batchSkipAlreadyInteracted = ref(true);
const batchTemplateId = ref('');
const batchCommentText = ref('Excelente conteúdo no canal {nome_canal}! Parabéns pelo vídeo {titulo_video} 👏');
const isExecutingBatch = ref(false);
const batchResult = ref<BatchEngagementResult | null>(null);
const batchExecutionProgress = ref({ current: 0, total: 0 });

// Single Channel Details modal
const selectedChannel = ref<ChannelSummary | null>(null);
const availableTemplates = ref<CommentTemplateDto[]>([]);
const selectedTemplateId = ref('');
const customAssunto = ref('');
const customCommentText = ref('');
const recentActionNotice = ref<string | null>(null);
const isRecordingAction = ref(false);

// Computed properties for multi-selection
const isAllSelected = computed(() => {
  return channels.value.length > 0 && channels.value.every((c) => selectedChannelIds.value.includes(c.id));
});

const selectedChannelsList = computed(() => {
  return channels.value.filter((c) => selectedChannelIds.value.includes(c.id));
});

const selectedChannelsWithVideoCount = computed(() => {
  return selectedChannelsList.value.filter((c) => !!c.latestVideo).length;
});

function toggleSelectAll() {
  if (isAllSelected.value) {
    selectedChannelIds.value = [];
  } else {
    selectedChannelIds.value = channels.value.map((c) => c.id);
  }
}

function clearSelection() {
  selectedChannelIds.value = [];
}

function onFilterChange() {
  currentPage.value = 1;
  loadChannels();
}

function onPageSizeChange() {
  currentPage.value = 1;
  loadChannels();
}

async function selectAllAcrossAllPages() {
  if (pageSize.value !== -1) {
    pageSize.value = -1;
    await loadChannels();
  }
  selectedChannelIds.value = channels.value.map((c) => c.id);
}

function resetFilters() {
  engagementFilter.value = 'all';
  hasVideoOnly.value = false;
  searchQuery.value = '';
  currentPage.value = 1;
  loadChannels();
}

async function loadChannels() {
  isLoading.value = true;
  errorMessage.value = null;
  try {
    const res = await apiService.getChannels({
      search: searchQuery.value || undefined,
      hasLatestVideo: hasVideoOnly.value || undefined,
      engagementStatus: engagementFilter.value === 'all' ? undefined : engagementFilter.value,
      sortBy: sortBy.value as any,
      page: currentPage.value,
      pageSize: pageSize.value,
    });
    channels.value = res.items || [];
    totalChannels.value = res.total;
    totalPages.value = res.totalPages;
  } catch (err: any) {
    errorMessage.value = err.message || 'Erro ao carregar canais';
    channels.value = [];
  } finally {
    isLoading.value = false;
  }
}

async function loadTemplates() {
  try {
    availableTemplates.value = await apiService.getTemplates();
    if (availableTemplates.value.length > 0 && !batchTemplateId.value) {
      batchTemplateId.value = availableTemplates.value[0].id;
      batchCommentText.value = availableTemplates.value[0].content;
    }
  } catch {
    availableTemplates.value = [];
  }
}

function openBatchModal() {
  if (selectedChannelIds.value.length === 0) {
    appStore.showToast('Selecione pelo menos um canal para engajamento em lote.', 'info');
    return;
  }
  batchResult.value = null;
  isExecutingBatch.value = false;
  isBatchModalOpen.value = true;
}

function closeBatchModal() {
  if (isExecutingBatch.value) return;
  isBatchModalOpen.value = false;
  batchResult.value = null;
}

function applyBatchTemplate() {
  const tpl = availableTemplates.value.find((t) => t.id === batchTemplateId.value);
  if (tpl) {
    batchCommentText.value = tpl.content;
  }
}

function insertBatchVar(varTag: string) {
  batchCommentText.value += ` ${varTag}`;
}

async function executeBatchEngagement() {
  if (selectedChannelIds.value.length === 0) return;
  if (batchActionTypes.value.length === 0) {
    appStore.showToast('Selecione ao menos uma ação (Comentar ou Curtir).', 'error');
    return;
  }

  isExecutingBatch.value = true;
  batchExecutionProgress.value = { current: 0, total: selectedChannelIds.value.length };

  try {
    // Simulated progress tick while backend processes
    const tickInterval = setInterval(() => {
      if (batchExecutionProgress.value.current < selectedChannelIds.value.length) {
        batchExecutionProgress.value.current++;
      }
    }, 400);

    const result = await apiService.executeBatchEngagement({
      channelIds: selectedChannelIds.value,
      actionTypes: batchActionTypes.value,
      commentText: batchActionTypes.value.includes('COMMENT') ? batchCommentText.value : undefined,
      templateId: batchTemplateId.value || undefined,
      skipAlreadyInteracted: batchSkipAlreadyInteracted.value,
    });

    clearInterval(tickInterval);
    batchExecutionProgress.value.current = selectedChannelIds.value.length;
    batchResult.value = result;

    appStore.showToast(
      `Engajamento em lote concluído: ${result.successCount} com sucesso, ${result.skippedCount} pulados.`,
      'success',
    );
  } catch (err: any) {
    appStore.showToast(err.message || 'Falha ao executar engajamento em lote.', 'error');
  } finally {
    isExecutingBatch.value = false;
  }
}

async function finishBatchAndRefresh() {
  isBatchModalOpen.value = false;
  batchResult.value = null;
  clearSelection();
  await loadChannels();
}

// Single Channel Engagement actions
async function singleLikeVideo(ch: ChannelSummary) {
  if (!ch.latestVideo) return;
  isRecordingAction.value = true;
  try {
    const res = await apiService.executeBatchEngagement({
      channelIds: [ch.id],
      actionTypes: ['LIKE'],
      skipAlreadyInteracted: false,
    });
    const r = res.results?.[0];
    if (res.successCount > 0 && r?.liked) {
      appStore.showToast(`Vídeo de "${ch.title}" curtido com sucesso!`, 'success');
      ch.hasLiked = true;
      ch.lastEngagementDate = new Date().toISOString();
      ch.lastEngagementError = null;
    } else {
      const errMsg = r?.error || res.quotaMessage || 'Não foi possível curtir o vídeo.';
      ch.lastEngagementError = errMsg;
      appStore.showToast(errMsg, 'error');
    }
  } catch (err: any) {
    const msg = err.message || 'Erro ao curtir vídeo';
    ch.lastEngagementError = msg;
    appStore.showToast(msg, 'error');
  } finally {
    isRecordingAction.value = false;
  }
}

async function singleCommentAndLike(ch: ChannelSummary) {
  if (!ch.latestVideo || !customCommentText.value) return;
  isRecordingAction.value = true;
  try {
    const res = await apiService.executeBatchEngagement({
      channelIds: [ch.id],
      actionTypes: ['COMMENT', 'LIKE'],
      commentText: customCommentText.value,
      skipAlreadyInteracted: false,
    });
    const r = res.results?.[0];
    if (res.successCount > 0 && r?.commentSent && r?.liked) {
      appStore.showToast(`Comentado e curtido com sucesso no canal "${ch.title}"!`, 'success');
      ch.hasCommented = true;
      ch.hasLiked = true;
      ch.lastEngagementDate = new Date().toISOString();
      ch.lastEngagementError = null;
      selectedChannel.value = null;
      await loadChannels();
    } else if (r?.commentSent || r?.liked) {
      if (r?.commentSent) ch.hasCommented = true;
      if (r?.liked) ch.hasLiked = true;
      ch.lastEngagementDate = new Date().toISOString();
      const warnMsg = r?.error || 'Ação parcialmente concluída com avisos.';
      ch.lastEngagementError = warnMsg;
      appStore.showToast(warnMsg, 'info');
      selectedChannel.value = null;
      await loadChannels();
    } else {
      const errMsg = r?.error || res.quotaMessage || 'Não foi possível concluir o engajamento.';
      ch.lastEngagementError = errMsg;
      appStore.showToast(errMsg, 'error');
    }
  } catch (err: any) {
    const msg = err.message || 'Erro ao engajar';
    ch.lastEngagementError = msg;
    appStore.showToast(msg, 'error');
  } finally {
    isRecordingAction.value = false;
  }
}

async function openChannelDetails(ch: ChannelSummary) {
  selectedChannel.value = ch;
  selectedTemplateId.value = '';
  customAssunto.value = '';
  customCommentText.value = '';
  recentActionNotice.value = null;

  if (availableTemplates.value.length > 0) {
    selectedTemplateId.value = availableTemplates.value[0].id;
    await applySelectedTemplate();
  }

  try {
    const previewRes: any = await apiService.previewEngagement({
      channelId: ch.id,
      videoId: ch.latestVideo?.id,
      templateId: selectedTemplateId.value || undefined,
    });
    if (previewRes.hasRecentAction) {
      const dateFormatted = previewRes.recentActionDate
        ? new Date(previewRes.recentActionDate).toLocaleDateString('pt-BR')
        : '';
      recentActionNotice.value = `Atenção: Uma interação [${previewRes.recentActionStatus}] já foi registrada para este canal em ${dateFormatted}.`;
    }
  } catch {
    // Non-blocking
  }
}

async function applySelectedTemplate() {
  if (!selectedChannel.value) return;
  const tpl = availableTemplates.value.find((t) => t.id === selectedTemplateId.value);
  if (!tpl) return;
  const channelName = selectedChannel.value.title;
  const videoTitle = selectedChannel.value.latestVideo?.title || 'seu vídeo mais recente';
  const assunto = customAssunto.value || 'conteúdo';

  customCommentText.value = tpl.content
    .replace(/{nome_canal}/g, channelName)
    .replace(/{titulo_canal}/g, channelName)
    .replace(/{titulo_video}/g, videoTitle)
    .replace(/{assunto}/g, assunto);
}

async function copyComment() {
  if (!customCommentText.value || !selectedChannel.value) return;
  isRecordingAction.value = true;
  try {
    await navigator.clipboard.writeText(customCommentText.value);

    const res = await apiService.executeEngagement({
      channelId: selectedChannel.value.id,
      videoId: selectedChannel.value.latestVideo?.id,
      type: 'COMMENT',
      status: 'COPIED',
      commentText: customCommentText.value,
      notes: 'Copiado para colagem manual no YouTube',
    });

    if (res.isDuplicate) {
      appStore.showToast('Comentário copiado! (Ação idêntica já estava no histórico)', 'info');
    } else {
      appStore.showToast('Comentário copiado e registrado no histórico!', 'success');
      selectedChannel.value.hasCommented = true;
    }
  } catch {
    appStore.showToast('Não foi possível copiar automaticamente.', 'error');
  } finally {
    isRecordingAction.value = false;
  }
}

async function startSync() {
  isSyncing.value = true;
  try {
    const res = await apiService.syncSubscribers();
    appStore.showToast('Sincronização iniciada com sucesso.', 'info');
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const job = await apiService.getJobStatus(res.jobId);
        if (job.status === 'COMPLETED' || job.status === 'FAILED' || attempts > 25) {
          clearInterval(interval);
          isSyncing.value = false;
          if (job.status === 'COMPLETED') {
            appStore.showToast(`Sincronização concluída! ${job.processedCount} canais processados.`, 'success');
          }
          await loadChannels();
        }
      } catch {
        clearInterval(interval);
        isSyncing.value = false;
      }
    }, 1000);
  } catch (err: any) {
    appStore.showToast(err.message || 'Erro ao iniciar sincronização', 'error');
    isSyncing.value = false;
  }
}

async function startVideosSync() {
  isSyncingVideos.value = true;
  try {
    const res = await apiService.syncAllLatestVideos();
    appStore.showToast('Busca de últimos vídeos iniciada.', 'info');
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const job = await apiService.getJobStatus(res.jobId);
        if (job.status === 'COMPLETED' || job.status === 'FAILED' || attempts > 25) {
          clearInterval(interval);
          isSyncingVideos.value = false;
          if (job.status === 'COMPLETED') {
            appStore.showToast(`Vídeos recentes atualizados com sucesso!`, 'success');
          }
          await loadChannels();
        }
      } catch {
        clearInterval(interval);
        isSyncingVideos.value = false;
      }
    }, 1000);
  } catch (err: any) {
    appStore.showToast(err.message || 'Erro ao sincronizar vídeos', 'error');
    isSyncingVideos.value = false;
  }
}

async function syncSingleVideo(channelId: string) {
  syncingVideoChannelId.value = channelId;
  try {
    await apiService.syncChannelVideo(channelId);
    appStore.showToast('Vídeo recente atualizado com sucesso.', 'success');
    await loadChannels();
    if (selectedChannel.value?.id === channelId) {
      const updated = await apiService.getChannelById(channelId);
      selectedChannel.value = updated;
      applySelectedTemplate();
    }
  } catch (err: any) {
    appStore.showToast(err.message || 'Erro ao buscar último vídeo', 'error');
  } finally {
    syncingVideoChannelId.value = null;
  }
}

function changePage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  currentPage.value = page;
  loadChannels();
}

let searchDebounce: any = null;
function onSearch() {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(() => {
    currentPage.value = 1;
    loadChannels();
  }, 300);
}

function formatNumber(num: number): string {
  if (num >= 1_000_000) return (num / 1_000_000).toFixed(1) + 'M';
  if (num >= 1_000) return (num / 1_000).toFixed(1) + 'K';
  return num.toString();
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return 'Nunca';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR') + ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatRelativeDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  const now = new Date();
  const diffHours = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60));
  if (diffHours < 24) return `há ${diffHours}h`;
  const diffDays = Math.round(diffHours / 24);
  return `há ${diffDays}d`;
}

function shortError(err?: string | null): string {
  if (!err) return '';
  if (err.includes('Quota diária') || err.toLowerCase().includes('quota')) {
    return 'Quota da API esgotada';
  }
  if (err.includes('Comentários desativados')) {
    return 'Comentários desativados';
  }
  if (err.includes('Reconecte o canal') || err.includes('Sessão do Google expirada')) {
    return 'Reconectar canal';
  }
  if (err.includes('Permissão insuficiente')) {
    return 'Permissão insuficiente';
  }
  if (err.length > 40) {
    return err.slice(0, 37) + '...';
  }
  return err;
}

onMounted(() => {
  loadChannels();
  loadTemplates();
});
</script>
