<template>
  <div>
    <!-- Backdrop for mobile -->
    <div
      v-if="isOpen"
      @click="$emit('close')"
      class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
    ></div>

    <!-- Aside container -->
    <aside
      :class="[
        'fixed top-0 bottom-0 left-0 z-50 w-64 glass-panel border-r border-slate-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static',
        isOpen ? 'translate-x-0' : '-translate-x-full'
      ]"
    >
      <!-- Brand in sidebar on mobile -->
      <div class="p-5 border-b border-slate-800 flex items-center justify-between lg:hidden">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg bg-brand-600 flex items-center justify-center">
            <svg class="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
            </svg>
          </div>
          <span class="font-bold text-sm text-white">YT Engagement</span>
        </div>
        <button @click="$emit('close')" class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800">
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <!-- Navigation links -->
      <nav class="flex-1 p-4 space-y-1.5 overflow-y-auto">
        <RouterLink
          v-for="item in navItems"
          :key="item.path"
          :to="item.path"
          @click="$emit('close')"
          class="flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors"
          :class="isCurrentRoute(item.path)
            ? 'bg-brand-600/15 text-brand-400 border border-brand-500/20'
            : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'"
        >
          <component :is="item.icon" class="w-4 h-4 flex-shrink-0" />
          <span>{{ item.label }}</span>
          <span v-if="item.badge" class="ml-auto text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
            {{ item.badge }}
          </span>
        </RouterLink>
      </nav>

      <!-- Footer / API Info -->
      <div class="p-4 border-t border-slate-800/80">
        <div class="glass-card p-3 rounded-xl">
          <p class="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">Políticas YouTube</p>
          <p class="text-[11px] text-slate-400 mt-1 leading-relaxed">
            Interações manuais auditadas com prévia. Sem ações em massa ou bots.
          </p>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from 'vue-router';
import { h } from 'vue';

const props = defineProps<{
  isOpen: boolean;
}>();

defineEmits<{
  (e: 'close'): void;
}>();

const route = useRoute();

function isCurrentRoute(path: string) {
  if (path === '/') return route.path === '/';
  return route.path.startsWith(path);
}

// Simple SVG icon renderers
const IconDashboard = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: '2' }, [
  h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' })
]);

const IconUsers = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: '2' }, [
  h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z' })
]);

const IconTemplates = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: '2' }, [
  h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z' })
]);

const IconJobs = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: '2' }, [
  h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15' })
]);

const IconSettings = () => h('svg', { fill: 'none', stroke: 'currentColor', viewBox: '0 0 24 24', strokeWidth: '2' }, [
  h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z' }),
  h('path', { strokeLinecap: 'round', strokeLinejoin: 'round', d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z' })
]);

interface NavItem {
  path: string;
  label: string;
  icon: () => any;
  badge?: string;
}

const navItems: NavItem[] = [
  { path: '/', label: 'Dashboard', icon: IconDashboard },
  { path: '/subscribers', label: 'Inscritos & Canais', icon: IconUsers },
  { path: '/templates', label: 'Modelos de Comentário', icon: IconTemplates },
  { path: '/jobs', label: 'Tarefas & Histórico', icon: IconJobs },
  { path: '/settings', label: 'Configurações & Quota', icon: IconSettings }
];
</script>
