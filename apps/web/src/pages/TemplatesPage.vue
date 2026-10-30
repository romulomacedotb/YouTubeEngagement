<template>
  <div class="space-y-6">
    <!-- Header -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-bold text-white tracking-tight">Modelos de Comentário</h1>
        <p class="text-sm text-slate-400">
          Crie e gerencie mensagens pré-definidas com variáveis dinâmicas para revisão manual e cópia rápida.
        </p>
      </div>

      <div class="flex items-center gap-2">
        <button
          @click="openCreateModal"
          class="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs sm:text-sm transition shadow-md shadow-brand-950/40"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4" />
          </svg>
          <span>Novo Modelo</span>
        </button>
      </div>
    </div>

    <!-- Live Preview & Variable Testing Simulator Box -->
    <div class="glass-card p-5 sm:p-6 rounded-2xl border border-slate-800 bg-slate-900/70">
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
        <div>
          <span class="text-[11px] font-bold uppercase tracking-wider text-brand-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-brand-500"></span>
            Simulador de Interpolação de Variáveis
          </span>
          <p class="text-xs text-slate-400 mt-0.5">
            Visualize como os modelos são formatados antes de copiar para o YouTube.
          </p>
        </div>

        <div class="flex items-center gap-2">
          <span class="text-xs text-slate-400">Variáveis suportadas:</span>
          <span class="px-2 py-0.5 rounded bg-slate-800 text-brand-300 font-mono text-[11px] border border-slate-700">
            {nome_canal}
          </span>
          <span class="px-2 py-0.5 rounded bg-slate-800 text-brand-300 font-mono text-[11px] border border-slate-700">
            {titulo_video}
          </span>
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="space-y-3">
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Exemplo de Nome do Canal</label>
            <input
              v-model="simChannel"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>
          <div>
            <label class="block text-xs font-semibold text-slate-300 mb-1">Exemplo de Título do Vídeo</label>
            <input
              v-model="simVideo"
              type="text"
              class="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
            />
          </div>
        </div>

        <div class="p-4 rounded-xl bg-slate-950 border border-slate-800/80 flex flex-col justify-between">
          <div>
            <div class="flex items-center justify-between mb-2">
              <span class="text-[11px] font-semibold text-slate-400">Prévia do Comentário Selecionado</span>
              <span v-if="selectedPreviewTemplate" class="text-[10px] text-slate-500">
                {{ selectedPreviewTemplate.name }}
              </span>
            </div>
            <p class="text-xs text-slate-200 whitespace-pre-wrap leading-relaxed font-sans bg-slate-900/90 p-3 rounded-lg border border-slate-800 min-h-[70px]">
              {{ interpolatedPreview || 'Selecione um modelo abaixo para visualizar a prévia aqui.' }}
            </p>
          </div>

          <div class="mt-3 flex justify-end">
            <button
              @click="copyText(interpolatedPreview)"
              :disabled="!interpolatedPreview"
              class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white text-xs font-medium border border-slate-700 transition"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copiar Texto da Prévia</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Category Filter Tabs -->
    <div class="flex flex-wrap items-center gap-2">
      <button
        v-for="cat in categories"
        :key="cat"
        @click="activeCategory = cat"
        class="px-3 py-1.5 rounded-xl text-xs font-semibold transition"
        :class="activeCategory === cat
          ? 'bg-brand-600 text-white shadow-sm'
          : 'bg-slate-850 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800'"
      >
        {{ cat }}
      </button>
    </div>

    <!-- Loading State -->
    <div v-if="isLoading" class="p-16 text-center text-slate-400">
      <div class="inline-block animate-spin w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full mb-3"></div>
      <p class="text-xs">Carregando modelos de comentário...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="filteredTemplates.length === 0" class="glass-card p-12 text-center rounded-2xl">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-800/80 flex items-center justify-center text-slate-500">
        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
        </svg>
      </div>
      <h3 class="text-base font-semibold text-white">Nenhum modelo cadastrado nesta categoria</h3>
      <p class="text-xs text-slate-400 max-w-md mx-auto mt-1 mb-4">
        Crie modelos para preparar respostas respeitosas, relevantes e contextualizadas com rapidez.
      </p>
      <button
        @click="openCreateModal"
        class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs transition"
      >
        Criar Primeiro Modelo
      </button>
    </div>

    <!-- Templates Grid -->
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div
        v-for="tpl in filteredTemplates"
        :key="tpl.id"
        class="glass-card p-5 rounded-2xl flex flex-col justify-between transition hover:border-slate-700/80 group"
        :class="selectedPreviewTemplate?.id === tpl.id ? 'ring-1 ring-brand-500/60 border-brand-500/40' : ''"
      >
        <div>
          <div class="flex items-center justify-between mb-3">
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold text-white">{{ tpl.name }}</h4>
              <span class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                {{ tpl.category || 'Geral' }}
              </span>
            </div>

            <button
              @click="selectForPreview(tpl)"
              class="text-xs text-sky-400 hover:text-sky-300 font-medium"
            >
              Simular
            </button>
          </div>

          <div class="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 text-xs text-slate-300 whitespace-pre-wrap leading-relaxed font-mono">
            {{ tpl.content }}
          </div>
        </div>

        <!-- Footer / Card Actions -->
        <div class="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div class="flex items-center gap-2">
            <button
              @click="copyInterpolated(tpl)"
              class="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 font-medium text-xs transition"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              <span>Copiar Texto</span>
            </button>
          </div>

          <div class="flex items-center gap-2">
            <button
              @click="openEditModal(tpl)"
              class="text-slate-400 hover:text-white transition px-2 py-1 rounded hover:bg-slate-800"
            >
              Editar
            </button>
            <button
              @click="deleteTemplate(tpl.id)"
              class="text-rose-400 hover:text-rose-300 transition px-2 py-1 rounded hover:bg-rose-950/40"
            >
              Excluir
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Create / Edit Modal -->
    <div
      v-if="showModal"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    >
      <div class="glass-panel w-full max-w-lg p-6 rounded-2xl border border-slate-700 space-y-4">
        <div class="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 class="text-base font-bold text-white">
            {{ isEditing ? 'Editar Modelo de Comentário' : 'Novo Modelo de Comentário' }}
          </h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-white">✕</button>
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Título do Modelo</label>
          <input
            v-model="modalForm.name"
            placeholder="Ex: Agradecimento por Novo Conteúdo"
            class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          />
        </div>

        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1">Categoria</label>
          <select
            v-model="modalForm.category"
            class="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
          >
            <option value="Geral">Geral</option>
            <option value="Agradecimento">Agradecimento</option>
            <option value="Elogio">Elogio</option>
            <option value="Pergunta">Pergunta / Discussão</option>
            <option value="Colaboração">Colaboração</option>
          </select>
        </div>

        <div>
          <div class="flex items-center justify-between mb-1">
            <label class="text-xs font-semibold text-slate-300">Conteúdo do Comentário</label>
            <div class="flex items-center gap-1.5 text-[10px]">
              <span class="text-slate-400">Inserir:</span>
              <button
                @click="insertVariable('{nome_canal}')"
                type="button"
                class="px-1.5 py-0.5 rounded bg-slate-800 text-brand-300 hover:bg-brand-600 hover:text-white transition"
              >
                {nome_canal}
              </button>
              <button
                @click="insertVariable('{titulo_video}')"
                type="button"
                class="px-1.5 py-0.5 rounded bg-slate-800 text-brand-300 hover:bg-brand-600 hover:text-white transition"
              >
                {titulo_video}
              </button>
            </div>
          </div>
          <textarea
            ref="contentInputRef"
            v-model="modalForm.content"
            rows="5"
            placeholder="Olá {nome_canal}, adorei o seu vídeo sobre {titulo_video}! Parabéns pelo trabalho."
            class="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-brand-500 font-mono leading-relaxed"
          ></textarea>
        </div>

        <!-- Live Modal Preview -->
        <div class="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs text-slate-300">
          <div class="text-[10px] font-semibold text-slate-500 mb-1">Prévia instantânea com dados de teste:</div>
          <div class="italic text-slate-300 font-sans">
            {{ formatInterpolation(modalForm.content, simChannel, simVideo) || 'Digite acima para ver a prévia...' }}
          </div>
        </div>

        <div class="flex justify-end gap-2 pt-2 border-t border-slate-800">
          <button
            @click="showModal = false"
            class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
          >
            Cancelar
          </button>
          <button
            @click="saveModal"
            class="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-950/40"
          >
            {{ isEditing ? 'Atualizar Modelo' : 'Criar Modelo' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import type { CommentTemplateDto } from '@youtube-engagement/shared';
import { apiService } from '../services/api';
import { useAppStore } from '../stores/app';

const appStore = useAppStore();

const templates = ref<CommentTemplateDto[]>([]);
const isLoading = ref(false);
const activeCategory = ref('Todas');
const categories = ['Todas', 'Geral', 'Agradecimento', 'Elogio', 'Pergunta', 'Colaboração'];

// Simulator variables
const simChannel = ref('Tech Insights Brasil');
const simVideo = ref('Como Escalar Aplicações Node.js e NestJS em 2026');
const selectedPreviewTemplate = ref<CommentTemplateDto | null>(null);

// Modal state
const showModal = ref(false);
const isEditing = ref(false);
const editingId = ref<string | null>(null);
const contentInputRef = ref<HTMLTextAreaElement | null>(null);

const modalForm = ref({
  name: '',
  content: '',
  category: 'Geral'
});

const filteredTemplates = computed(() => {
  if (activeCategory.value === 'Todas') return templates.value;
  return templates.value.filter((t) => (t.category || 'Geral') === activeCategory.value);
});

const interpolatedPreview = computed(() => {
  if (!selectedPreviewTemplate.value) return '';
  return formatInterpolation(selectedPreviewTemplate.value.content, simChannel.value, simVideo.value);
});

function formatInterpolation(content: string, channelName: string, videoTitle: string): string {
  if (!content) return '';
  return content
    .replace(/{nome_canal}/g, channelName)
    .replace(/{titulo_canal}/g, channelName)
    .replace(/{titulo_video}/g, videoTitle);
}

function selectForPreview(tpl: CommentTemplateDto) {
  selectedPreviewTemplate.value = tpl;
}

function insertVariable(variable: string) {
  modalForm.value.content += (modalForm.value.content ? ' ' : '') + variable;
}

async function loadTemplates() {
  isLoading.value = true;
  try {
    templates.value = await apiService.getTemplates();
    if (templates.value.length > 0 && !selectedPreviewTemplate.value) {
      selectedPreviewTemplate.value = templates.value[0];
    }
  } catch (err: any) {
    templates.value = [];
    appStore.showToast(err.message || 'Erro ao carregar modelos', 'error');
  } finally {
    isLoading.value = false;
  }
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  modalForm.value = { name: '', content: '', category: 'Geral' };
  showModal.value = true;
}

function openEditModal(tpl: CommentTemplateDto) {
  isEditing.value = true;
  editingId.value = tpl.id;
  modalForm.value = {
    name: tpl.name,
    content: tpl.content,
    category: tpl.category || 'Geral'
  };
  showModal.value = true;
}

async function saveModal() {
  if (!modalForm.value.name.trim() || !modalForm.value.content.trim()) {
    appStore.showToast('Por favor, informe título e conteúdo do modelo.', 'error');
    return;
  }

  try {
    if (isEditing.value && editingId.value) {
      const updated = await apiService.updateTemplate(editingId.value, {
        name: modalForm.value.name,
        content: modalForm.value.content,
        category: modalForm.value.category
      });
      appStore.showToast('Modelo atualizado com sucesso!', 'success');
      if (selectedPreviewTemplate.value?.id === updated.id) {
        selectedPreviewTemplate.value = updated;
      }
    } else {
      const created = await apiService.createTemplate({
        name: modalForm.value.name,
        content: modalForm.value.content,
        category: modalForm.value.category
      });
      appStore.showToast('Modelo criado com sucesso!', 'success');
      selectedPreviewTemplate.value = created;
    }
    showModal.value = false;
    await loadTemplates();
  } catch (err: any) {
    appStore.showToast(err.message || 'Erro ao salvar modelo', 'error');
  }
}

async function deleteTemplate(id: string) {
  if (!confirm('Deseja realmente excluir este modelo?')) return;
  try {
    await apiService.deleteTemplate(id);
    appStore.showToast('Modelo excluído.', 'info');
    if (selectedPreviewTemplate.value?.id === id) {
      selectedPreviewTemplate.value = null;
    }
    await loadTemplates();
  } catch (err: any) {
    appStore.showToast(err.message || 'Erro ao excluir modelo', 'error');
  }
}

async function copyText(text: string) {
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
    appStore.showToast('Comentário copiado para a área de transferência!', 'success');
  } catch {
    appStore.showToast('Não foi possível copiar automaticamente.', 'error');
  }
}

async function copyInterpolated(tpl: CommentTemplateDto) {
  const text = formatInterpolation(tpl.content, simChannel.value, simVideo.value);
  await copyText(text);
}

onMounted(loadTemplates);
</script>
