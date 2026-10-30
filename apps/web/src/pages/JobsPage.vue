<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Tarefas & Histórico</h1>
        <p class="text-sm text-slate-400">
          Consulte o histórico de interações manuais preparadas e acompanhe as sincronizações de dados.
        </p>
      </div>

      <button
        @click="refreshData"
        class="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-sm font-medium border border-slate-700 transition"
      >
        <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Atualizar</span>
      </button>
    </div>

    <!-- Navigation Tabs -->
    <div class="flex border-b border-slate-800 space-x-4">
      <button
        @click="activeTab = 'interactions'"
        class="pb-3 text-sm font-semibold transition relative"
        :class="activeTab === 'interactions' ? 'text-brand-400' : 'text-slate-400 hover:text-slate-200'"
      >
        <span>Histórico de Interações ({{ totalActions }})</span>
        <span
          v-if="activeTab === 'interactions'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full"
        ></span>
      </button>

      <button
        @click="activeTab = 'syncJobs'"
        class="pb-3 text-sm font-semibold transition relative"
        :class="activeTab === 'syncJobs' ? 'text-brand-400' : 'text-slate-400 hover:text-slate-200'"
      >
        <span>Sincronizações YouTube ({{ jobs.length }})</span>
        <span
          v-if="activeTab === 'syncJobs'"
          class="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-500 rounded-full"
        ></span>
      </button>
    </div>

    <!-- TAB 1: INTERACTIONS HISTORY -->
    <div v-if="activeTab === 'interactions'" class="space-y-4">
      <!-- Status Filter Tabs -->
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="flex flex-wrap items-center gap-2">
          <button
            v-for="st in statusFilters"
            :key="st.value"
            @click="changeStatusFilter(st.value)"
            class="px-3 py-1.5 rounded-xl text-xs font-semibold transition"
            :class="selectedStatus === st.value
              ? 'bg-brand-600 text-white shadow-sm'
              : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'"
          >
            {{ st.label }}
          </button>
        </div>

        <span class="text-xs text-slate-500">
          🛡️ Todas as interações exigem confirmação manual pelo usuário.
        </span>
      </div>

      <!-- Loading State -->
      <div v-if="isLoadingActions" class="p-16 text-center text-slate-400">
        <div class="inline-block animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-3"></div>
        <p class="text-xs">Carregando histórico de interações...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="actions.length === 0" class="glass-card p-12 text-center rounded-2xl">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-white">Nenhuma interação registrada ainda</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
          Ao copiar comentários ou abrir vídeos para interagir a partir da lista de inscritos, os registros aparecerão aqui com status de revisão.
        </p>
        <RouterLink
          to="/subscribers"
          class="inline-block px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold"
        >
          Ir para Inscritos & Canais
        </RouterLink>
      </div>

      <!-- Actions List -->
      <div v-else class="space-y-3">
        <div
          v-for="act in actions"
          :key="act.id"
          class="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-700/80 transition"
        >
          <div class="flex items-start gap-3.5 min-w-0 flex-1">
            <img
              v-if="act.channelThumbnail"
              :src="act.channelThumbnail"
              :alt="act.channelTitle || 'Canal'"
              class="w-11 h-11 rounded-xl object-cover border border-slate-700 flex-shrink-0"
            />
            <div v-else class="w-11 h-11 rounded-xl bg-brand-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
              {{ act.channelTitle?.charAt(0) || 'C' }}
            </div>

            <div class="min-w-0 flex-1 space-y-1">
              <div class="flex items-center gap-2 flex-wrap">
                <h4 class="text-sm font-bold text-white truncate">{{ act.channelTitle || 'Canal' }}</h4>
                <span
                  :class="[
                    'text-[10px] px-2 py-0.5 rounded-full font-semibold border',
                    act.status === 'COPIED' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' :
                    act.status === 'CONFIRMED' ? 'bg-sky-950/60 text-sky-300 border-sky-500/30' :
                    act.status === 'PREPARED' ? 'bg-amber-950/60 text-amber-300 border-amber-500/30' :
                    'bg-slate-800 text-slate-300 border-slate-700'
                  ]"
                >
                  {{ formatActionStatus(act.status) }}
                </span>
                <span class="text-[10px] text-slate-500 font-mono">
                  {{ formatDate(act.createdAt) }}
                </span>
              </div>

              <p v-if="act.videoTitle" class="text-xs text-sky-300 truncate font-medium flex items-center gap-1">
                <span>Vídeo:</span>
                <span>{{ act.videoTitle }}</span>
              </p>

              <div
                v-if="act.commentText"
                class="bg-slate-900/90 p-2.5 rounded-xl border border-slate-800 text-xs text-slate-200 line-clamp-2 font-mono whitespace-pre-wrap leading-relaxed mt-1"
              >
                {{ act.commentText }}
              </div>
            </div>
          </div>

          <!-- Action buttons -->
          <div class="flex items-center gap-2 justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
            <button
              v-if="act.commentText"
              @click="copyText(act.commentText)"
              class="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 transition"
              title="Copiar texto do comentário"
            >
              Copiar Texto
            </button>

            <a
              v-if="act.videoUrl"
              :href="act.videoUrl"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition"
            >
              <span>Abrir no YouTube</span>
              <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>

            <button
              @click="deleteAction(act.id)"
              class="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 transition"
              title="Excluir do histórico"
            >
              <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        <!-- History Pagination -->
        <div v-if="totalActionPages > 1" class="glass-card p-4 rounded-2xl flex items-center justify-between text-xs text-slate-400">
          <span>Página {{ currentActionPage }} de {{ totalActionPages }}</span>
          <div class="flex items-center gap-2">
            <button
              @click="changeActionPage(currentActionPage - 1)"
              :disabled="currentActionPage <= 1"
              class="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200"
            >
              Anterior
            </button>
            <button
              @click="changeActionPage(currentActionPage + 1)"
              :disabled="currentActionPage >= totalActionPages"
              class="px-3 py-1.5 rounded-lg bg-slate-800 disabled:opacity-40 text-slate-200"
            >
              Próxima
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- TAB 2: SYNC JOBS -->
    <div v-else-if="activeTab === 'syncJobs'" class="space-y-3">
      <div v-if="jobs.length === 0" class="glass-card p-12 text-center rounded-2xl">
        <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h3 class="text-base font-semibold text-white">Nenhuma tarefa executada ainda</h3>
        <p class="text-xs text-slate-400 max-w-md mx-auto mt-1">
          Sincronizações e tarefas assíncronas aparecerão aqui com contadores de processamento.
        </p>
      </div>

      <div v-else class="space-y-3">
        <div
          v-for="job in jobs"
          :key="job.id"
          class="glass-card p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4"
        >
          <div class="flex items-start gap-3.5">
            <div class="w-10 h-10 rounded-xl bg-slate-800 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h4 class="text-sm font-bold text-white">{{ formatJobType(job.type) }}</h4>
                <span class="text-[10px] font-mono text-slate-500">#{{ job.id.substring(0, 8) }}</span>
              </div>
              <p class="text-xs text-slate-400 mt-0.5">
                Iniciado: {{ formatDate(job.createdAt) }}
                <span v-if="job.finishedAt">
                  • Duração: {{ getDuration(job.startedAt, job.finishedAt) }}
                </span>
              </p>
              <p v-if="job.error" class="text-xs text-rose-400 mt-1 font-medium">
                Erro: {{ job.error }}
              </p>
            </div>
          </div>

          <div class="flex items-center gap-4 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0 border-slate-800">
            <div class="text-right text-xs">
              <div class="text-white font-semibold">
                {{ job.processedCount }} processados
              </div>
              <div v-if="job.errorCount > 0" class="text-[11px] text-rose-400">
                {{ job.errorCount }} erros
              </div>
            </div>

            <span
              :class="[
                'text-xs px-3 py-1 rounded-full font-medium border',
                job.status === 'COMPLETED' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30' :
                job.status === 'RUNNING' ? 'bg-sky-950/60 text-sky-300 border-sky-500/30 animate-pulse' :
                job.status === 'FAILED' ? 'bg-rose-950/60 text-rose-300 border-rose-500/30' :
                'bg-slate-800 text-slate-300 border-slate-700'
              ]"
            >
              {{ formatStatus(job.status) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { SyncJobDto, EngagementActionDto } from '@youtube-engagement/shared';
import { apiService } from '../services/api';
import { useAppStore } from '../stores/app';

const appStore = useAppStore();

const activeTab = ref<'interactions' | 'syncJobs'>('interactions');

// Interações state
const actions = ref<EngagementActionDto[]>([]);
const isLoadingActions = ref(false);
const totalActions = ref(0);
const currentActionPage = ref(1);
const totalActionPages = ref(1);
const selectedStatus = ref('');

const statusFilters = [
  { label: 'Todas as Interações', value: '' },
  { label: 'Copiadas para Envio', value: 'COPIED' },
  { label: 'Confirmadas', value: 'CONFIRMED' },
  { label: 'Preparadas', value: 'PREPARED' }
];

// Sync jobs state
const jobs = ref<SyncJobDto[]>([]);

async function loadActions() {
  isLoadingActions.value = true;
  try {
    const res = await apiService.getEngagementHistory({
      status: selectedStatus.value || undefined,
      page: currentActionPage.value,
      pageSize: 15
    });
    actions.value = res.items || [];
    totalActions.value = res.total;
    totalActionPages.value = res.totalPages;
  } catch (err: any) {
    actions.value = [];
    appStore.showToast(err.message || 'Erro ao carregar histórico', 'error');
  } finally {
    isLoadingActions.value = false;
  }
}

async function loadJobs() {
  try {
    jobs.value = await apiService.getJobs();
  } catch {
    jobs.value = [];
  }
}

function refreshData() {
  loadActions();
  loadJobs();
}

function changeStatusFilter(status: string) {
  selectedStatus.value = status;
  currentActionPage.value = 1;
  loadActions();
}

function changeActionPage(page: number) {
  if (page < 1 || page > totalActionPages.value) return;
  currentActionPage.value = page;
  loadActions();
}

async function copyText(text?: string | null) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    appStore.showToast('Comentário copiado para a área de transferência!', 'success');
  } catch {
    appStore.showToast('Erro ao copiar texto.', 'error');
  }
}

async function deleteAction(id: string) {
  if (!confirm('Remover este registro do histórico de interações?')) return;
  try {
    await apiService.deleteEngagementAction(id);
    appStore.showToast('Registro removido do histórico.', 'info');
    await loadActions();
  } catch (err: any) {
    appStore.showToast(err.message || 'Erro ao remover registro', 'error');
  }
}

function formatActionStatus(status: string): string {
  if (status === 'COPIED') return 'Copiado para Envio';
  if (status === 'CONFIRMED') return 'Confirmado';
  if (status === 'PREPARED') return 'Preparado';
  if (status === 'EXECUTED') return 'Concluído';
  return status;
}

function formatJobType(type: string): string {
  if (type === 'SUBSCRIBERS') return 'Sincronização de Inscritos';
  if (type === 'CHANNEL_REFRESH') return 'Atualização Individual de Canal';
  if (type === 'LATEST_VIDEOS') return 'Busca de Vídeos Recentes';
  return type;
}

function formatStatus(status: string): string {
  if (status === 'COMPLETED') return 'Concluído';
  if (status === 'RUNNING') return 'Em Execução';
  if (status === 'FAILED') return 'Falhou';
  if (status === 'PENDING') return 'Pendente';
  return status;
}

function formatDate(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR') + ' às ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function getDuration(startedAt?: string | null, finishedAt?: string | null): string {
  if (!startedAt || !finishedAt) return 'N/A';
  const start = new Date(startedAt).getTime();
  const end = new Date(finishedAt).getTime();
  const diffSec = Math.max(0, Math.round((end - start) / 1000));
  return `${diffSec}s`;
}

onMounted(() => {
  loadActions();
  loadJobs();
});
</script>
