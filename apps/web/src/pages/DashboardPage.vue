<template>
  <div class="space-y-6">
    <!-- Header banner -->
    <div class="glass-panel p-6 sm:p-8 rounded-3xl relative overflow-hidden">
      <div class="relative z-10 max-w-2xl">
        <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-400 text-xs font-semibold mb-3">
          <span>✨ Fase 6 — Preparação & Histórico de Interações</span>
          <span class="w-1 h-1 rounded-full bg-brand-400"></span>
          <span>Revisão Manual, Idempotência & Auditoria</span>
        </div>
        <h1 class="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Painel de Engajamento de Inscritos
        </h1>
        <p v-if="authStore.authState.authenticated && authStore.authState.channel" class="mt-2 text-emerald-300 text-sm font-medium flex items-center gap-2">
          <span>✓ Canal conectado: <strong>{{ authStore.authState.channel.channelTitle }}</strong></span>
        </p>
        <p v-else class="mt-2 text-slate-300 text-sm leading-relaxed">
          Localize seus inscritos acessíveis via API oficial do YouTube, monitore vídeos recentes publicados e prepare comentários personalizados com segurança e revisão manual.
        </p>

        <div class="mt-5 flex flex-wrap gap-3">
          <button
            @click="triggerSync"
            :disabled="isSyncing"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white font-medium text-sm transition shadow-lg shadow-brand-950/50"
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

          <RouterLink
            to="/subscribers"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm border border-slate-700 transition"
          >
            <span>Ver Canais Encontrados</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
            </svg>
          </RouterLink>

          <button
            v-if="appStore.canInstallPwa"
            @click="appStore.promptInstall()"
            class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-200 font-medium text-sm border border-indigo-500/30 transition"
          >
            <svg class="w-4 h-4 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
            <span>Instalar PWA</span>
          </button>
        </div>
      </div>

      <!-- Background decorative glow -->
      <div class="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-brand-600/10 blur-3xl pointer-events-none"></div>
      <div class="absolute right-10 top-10 w-40 h-40 rounded-full bg-sky-600/10 blur-2xl pointer-events-none"></div>
    </div>

    <!-- Quick Metrics -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <StatsCard
        title="Inscritos Acessíveis"
        :value="stats.channelsCount"
        subtitle="armazenados"
        iconBg="bg-blue-500/15 text-blue-400"
        glowColor="bg-blue-500"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        </template>
        <template #footer>
          <span>Pela API oficial do YouTube</span>
        </template>
      </StatsCard>

      <StatsCard
        title="Vídeos Recentes"
        :value="stats.videosCount"
        subtitle="identificados"
        iconBg="bg-emerald-500/15 text-emerald-400"
        glowColor="bg-emerald-500"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </template>
        <template #footer>
          <span>Com links diretos para o YouTube</span>
        </template>
      </StatsCard>

      <StatsCard
        title="Modelos Ativos"
        :value="stats.templatesCount"
        subtitle="comentários"
        iconBg="bg-purple-500/15 text-purple-400"
        glowColor="bg-purple-500"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
        </template>
        <template #footer>
          <span>Com prévia e cópia rápida</span>
        </template>
      </StatsCard>

      <StatsCard
        title="Estado da Conexão"
        :value="appStore.isOnline ? 'Online' : 'Offline'"
        subtitle="PWA e sincronização"
        :iconBg="appStore.isOnline ? 'bg-emerald-500/15 text-emerald-400' : 'bg-amber-500/15 text-amber-400'"
        :glowColor="appStore.isOnline ? 'bg-emerald-500' : 'bg-amber-500'"
      >
        <template #icon>
          <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
          </svg>
        </template>
        <template #footer>
          <span>Uptime: {{ Math.floor(appStore.health?.uptime || 0) }}s</span>
        </template>
      </StatsCard>
    </div>

    <!-- Recent Sync Activities Preview -->
    <div class="glass-card p-6 rounded-2xl">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-bold text-white">Tarefas Recentes de Sincronização</h2>
          <p class="text-xs text-slate-400">Últimos processos executados no sistema</p>
        </div>
        <RouterLink
          to="/jobs"
          class="text-xs font-semibold text-brand-400 hover:text-brand-300 transition"
        >
          Ver histórico completo →
        </RouterLink>
      </div>

      <div v-if="recentJobs.length === 0" class="p-6 text-center text-xs text-slate-400 bg-slate-900/40 rounded-xl border border-slate-800">
        Nenhuma sincronização recente registrada. Clique em "Sincronizar Inscritos" para iniciar.
      </div>

      <div v-else class="space-y-2.5">
        <div
          v-for="job in recentJobs"
          :key="job.id"
          class="flex items-center justify-between p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs"
        >
          <div class="flex items-center gap-3">
            <div class="w-2 h-2 rounded-full" :class="job.status === 'COMPLETED' ? 'bg-emerald-400' : job.status === 'FAILED' ? 'bg-rose-400' : 'bg-sky-400 animate-pulse'"></div>
            <div>
              <span class="font-semibold text-white">{{ formatJobType(job.type) }}</span>
              <span class="text-slate-500 ml-2 font-mono text-[10px]">#{{ job.id.substring(0, 8) }}</span>
            </div>
          </div>

          <div class="flex items-center gap-4 text-slate-400">
            <span>{{ job.processedCount }} processados</span>
            <span
              :class="[
                'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                job.status === 'COMPLETED' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' :
                job.status === 'FAILED' ? 'bg-rose-950/60 text-rose-300 border-rose-500/30' :
                'bg-sky-950/60 text-sky-300 border-sky-500/30'
              ]"
            >
              {{ job.status }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Health & Diagnostics Card -->
    <div class="glass-card p-6 rounded-2xl">
      <div class="flex items-center justify-between mb-4">
        <div>
          <h2 class="text-base font-bold text-white">Status da Infraestrutura</h2>
          <p class="text-xs text-slate-400">Verificação de integridade dos componentes locais e PWA</p>
        </div>
        <button
          @click="appStore.checkHealth()"
          class="text-xs font-semibold px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          Atualizar Diagnóstico
        </button>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-400">Backend NestJS</span>
            <StatusBadge :type="appStore.health?.status === 'ok' ? 'success' : 'warning'" :label="appStore.health?.status === 'ok' ? 'Ativo' : 'Aguardando'" />
          </div>
          <p class="text-xs text-slate-500 mt-2">Porta 3000 • Prefixo /api</p>
        </div>

        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-400">Banco SQLite / Prisma</span>
            <StatusBadge :type="appStore.health?.database === 'connected' ? 'success' : 'neutral'" :label="appStore.health?.database === 'connected' ? 'Conectado' : 'Pronto'" />
          </div>
          <p class="text-xs text-slate-500 mt-2">dev.db • 6 modelos mapeados</p>
        </div>

        <div class="p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div class="flex items-center justify-between">
            <span class="text-xs font-medium text-slate-400">Frontend PWA</span>
            <StatusBadge type="success" :label="appStore.isOnline ? 'Online & Instalável' : 'Modo Offline Ativo'" />
          </div>
          <p class="text-xs text-slate-500 mt-2">Vite 5 + Vue 3 + Service Worker</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';
import { apiService } from '../services/api';
import type { SyncJobDto } from '@youtube-engagement/shared';
import StatsCard from '../components/StatsCard.vue';
import StatusBadge from '../components/StatusBadge.vue';

const appStore = useAppStore();
const authStore = useAuthStore();
const isSyncing = ref(false);
const recentJobs = ref<SyncJobDto[]>([]);

const stats = ref({
  channelsCount: 0,
  videosCount: 0,
  templatesCount: 0
});

async function loadStats() {
  try {
    const [channelsRes, channelsWithVideoRes, templatesRes, jobsRes] = await Promise.all([
      apiService.getChannels({ page: 1, pageSize: 1 }).catch(() => ({ total: 0 })),
      apiService.getChannels({ page: 1, pageSize: 1, hasLatestVideo: true }).catch(() => ({ total: 0 })),
      apiService.getTemplates().catch(() => []),
      apiService.getJobs().catch(() => [])
    ]);
    stats.value.channelsCount = 'total' in channelsRes ? channelsRes.total : 0;
    stats.value.videosCount = 'total' in channelsWithVideoRes ? channelsWithVideoRes.total : 0;
    stats.value.templatesCount = Array.isArray(templatesRes) ? templatesRes.length : 0;
    recentJobs.value = Array.isArray(jobsRes) ? jobsRes.slice(0, 3) : [];
  } catch (e) {
    // Graceful fallback
  }
}

async function triggerSync() {
  isSyncing.value = true;
  try {
    const res = await apiService.syncSubscribers();
    appStore.showToast('Sincronização iniciada!', 'info');
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const job = await apiService.getJobStatus(res.jobId);
        if (job.status === 'COMPLETED' || job.status === 'FAILED' || attempts > 20) {
          clearInterval(interval);
          isSyncing.value = false;
          if (job.status === 'COMPLETED') {
            appStore.showToast(`Sincronização finalizada! ${job.processedCount} canais processados.`, 'success');
          }
          await loadStats();
        }
      } catch {
        clearInterval(interval);
        isSyncing.value = false;
      }
    }, 1000);
  } catch (err: any) {
    appStore.showToast(err.message || 'Falha ao sincronizar', 'error');
    isSyncing.value = false;
  }
}

function formatJobType(type: string): string {
  if (type === 'SUBSCRIBERS') return 'Sincronização de Inscritos';
  if (type === 'CHANNEL_REFRESH') return 'Atualização de Canal';
  if (type === 'LATEST_VIDEOS') return 'Busca de Vídeos';
  return type;
}

onMounted(() => {
  appStore.checkHealth();
  authStore.checkAuth();
  loadStats();
});
</script>
