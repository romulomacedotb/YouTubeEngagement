<template>
  <header class="glass-panel sticky top-0 z-30 border-b border-slate-800/80 px-4 sm:px-6 py-3.5 flex items-center justify-between">
    <div class="flex items-center gap-3">
      <!-- Mobile menu trigger -->
      <button
        @click="$emit('toggle-sidebar')"
        class="lg:hidden p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
        aria-label="Abrir menu"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div class="flex items-center gap-2.5">
        <div class="w-9 h-9 rounded-xl bg-gradient-to-tr from-brand-600 to-rose-500 flex items-center justify-center shadow-md shadow-brand-900/30">
          <svg class="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
          </svg>
        </div>
        <div>
          <span class="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
            YouTube Engagement
            <span class="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-400 border border-brand-500/30">
              MVP
            </span>
          </span>
          <p class="text-[11px] text-slate-400 hidden sm:block">Gestão segura de inscritos e interações manuais</p>
        </div>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <!-- Connectivity / Health Indicator -->
      <div class="flex items-center gap-2">
        <span
          class="inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border"
          :class="appStore.health?.status === 'ok' 
            ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/30' 
            : 'bg-amber-950/40 text-amber-400 border-amber-500/30'"
        >
          <span
            class="w-2 h-2 rounded-full"
            :class="appStore.health?.status === 'ok' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'"
          ></span>
          <span class="hidden md:inline">{{ appStore.health?.status === 'ok' ? 'API Online' : 'Conectando...' }}</span>
        </span>

        <span
          v-if="!appStore.isOnline"
          class="text-xs px-2 py-0.5 rounded bg-rose-950 text-rose-300 border border-rose-800"
        >
          Offline (PWA)
        </span>
      </div>

      <!-- Authenticated Channel or Connect Button -->
      <div v-if="authStore.authState.authenticated && authStore.authState.channel" class="flex items-center gap-2">
        <div class="flex items-center gap-2.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700">
          <img
            v-if="authStore.authState.channel.channelThumbnail"
            :src="authStore.authState.channel.channelThumbnail"
            alt="Canal"
            class="w-6 h-6 rounded-full object-cover border border-slate-600"
          />
          <div v-else class="w-6 h-6 rounded-full bg-brand-600 flex items-center justify-center text-[10px] font-bold text-white">
            {{ authStore.authState.channel.channelTitle?.charAt(0) || 'C' }}
          </div>
          <span class="text-xs font-medium text-white max-w-[120px] sm:max-w-[180px] truncate">
            {{ authStore.authState.channel.channelTitle }}
          </span>
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400" title="Canal conectado via OAuth"></span>
        </div>

        <button
          @click="authStore.logout()"
          title="Encerrar sessão"
          class="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
        </button>
      </div>

      <button
        v-else
        @click="authStore.startConnectFlow()"
        class="inline-flex items-center gap-2 text-xs font-semibold px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white transition shadow-sm shadow-brand-900/30 cursor-pointer"
      >
        <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
        </svg>
        <span>Conectar Canal</span>
      </button>
    </div>
  </header>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import { useAppStore } from '../stores/app';
import { useAuthStore } from '../stores/auth';

defineEmits<{
  (e: 'toggle-sidebar'): void;
}>();

const appStore = useAppStore();
const authStore = useAuthStore();

onMounted(() => {
  authStore.checkAuth();
});
</script>
