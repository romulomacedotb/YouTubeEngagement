<template>
  <div class="min-h-screen bg-[#0b0f19] flex flex-col font-sans selection:bg-brand-500 selection:text-white">
    <!-- Offline status notification banner -->
    <div
      v-if="!appStore.isOnline"
      class="bg-amber-600/95 text-white px-4 py-2 text-xs font-semibold flex items-center justify-center gap-2 border-b border-amber-500 z-50 transition-all sticky top-0"
    >
      <svg class="w-4 h-4 flex-shrink-0 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <span>Você está offline. O aplicativo está utilizando o cache local. Sincronizações e login exigem conexão ativa.</span>
    </div>

    <!-- PWA Install prompt bar -->
    <div
      v-if="appStore.canInstallPwa"
      class="bg-gradient-to-r from-brand-900 to-indigo-900 text-white px-4 py-2.5 text-xs flex items-center justify-between border-b border-brand-700/50 z-40"
    >
      <div class="flex items-center gap-2">
        <div class="w-6 h-6 rounded-lg bg-brand-500 flex items-center justify-center text-white">
          <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/>
          </svg>
        </div>
        <span class="font-medium">Instale o aplicativo YouTube Engagement para acesso rápido no seu dispositivo</span>
      </div>
      <div class="flex items-center gap-2">
        <button
          @click="appStore.promptInstall()"
          class="px-3 py-1 rounded-lg bg-brand-500 hover:bg-brand-400 text-white font-semibold transition"
        >
          Instalar Agora
        </button>
        <button
          @click="appStore.canInstallPwa = false"
          class="p-1 text-slate-300 hover:text-white"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Top Navbar -->
    <Navbar @toggle-sidebar="sidebarOpen = !sidebarOpen" />

    <div class="flex-1 flex max-w-7xl w-full mx-auto pb-16 lg:pb-0">
      <!-- Desktop & Drawer Sidebar navigation -->
      <Sidebar :isOpen="sidebarOpen" @close="sidebarOpen = false" />

      <!-- Main content container -->
      <main class="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        <RouterView />
      </main>
    </div>

    <!-- Mobile Bottom Navigation Bar (lg:hidden) -->
    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0d1322]/95 backdrop-blur-md border-t border-slate-800 px-2 py-1.5 flex items-center justify-around">
      <RouterLink
        to="/"
        class="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors"
        :class="$route.path === '/' ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
      >
        <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
        <span>Início</span>
      </RouterLink>

      <RouterLink
        to="/subscribers"
        class="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors"
        :class="$route.path.startsWith('/subscribers') ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
      >
        <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
        <span>Inscritos</span>
      </RouterLink>

      <RouterLink
        to="/templates"
        class="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors"
        :class="$route.path.startsWith('/templates') ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
      >
        <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
        <span>Modelos</span>
      </RouterLink>

      <RouterLink
        to="/jobs"
        class="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors"
        :class="$route.path.startsWith('/jobs') ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
      >
        <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        <span>Tarefas</span>
      </RouterLink>

      <RouterLink
        to="/settings"
        class="flex flex-col items-center justify-center py-1 px-2 rounded-xl text-[10px] font-medium transition-colors"
        :class="$route.path.startsWith('/settings') ? 'text-brand-400 font-bold' : 'text-slate-400 hover:text-slate-200'"
      >
        <svg class="w-5 h-5 mb-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span>Ajustes</span>
      </RouterLink>
    </nav>

    <!-- Global Toast Notification -->
    <transition
      enter-active-class="transform ease-out duration-300 transition"
      enter-from-class="translate-y-4 opacity-0 sm:translate-y-0 sm:translate-x-4"
      enter-to-class="translate-y-0 opacity-100 sm:translate-x-0"
      leave-active-class="transition ease-in duration-200"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="appStore.toast.visible"
        class="fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 max-w-sm rounded-2xl p-4 shadow-2xl border flex items-center gap-3 backdrop-blur-md"
        :class="[
          appStore.toast.type === 'success' ? 'bg-emerald-950/90 text-emerald-100 border-emerald-500/40 shadow-emerald-950/50' :
          appStore.toast.type === 'error' ? 'bg-rose-950/90 text-rose-100 border-rose-500/40 shadow-rose-950/50' :
          'bg-slate-900/90 text-slate-100 border-slate-700/60 shadow-black/50'
        ]"
      >
        <span v-if="appStore.toast.type === 'success'" class="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center flex-shrink-0">
          ✓
        </span>
        <span v-else-if="appStore.toast.type === 'error'" class="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center flex-shrink-0">
          ✕
        </span>
        <span v-else class="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 flex items-center justify-center flex-shrink-0">
          ℹ
        </span>
        <p class="text-xs font-medium leading-relaxed flex-1">
          {{ appStore.toast.message }}
        </p>
      </div>
    </transition>

    <!-- Connect Channel Selection Modal -->
    <ConnectChannelModal />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRoute } from 'vue-router';
import { useAppStore } from './stores/app';
import Navbar from './components/Navbar.vue';
import Sidebar from './components/Sidebar.vue';
import ConnectChannelModal from './components/ConnectChannelModal.vue';

const appStore = useAppStore();
const route = useRoute();
const sidebarOpen = ref(false);
</script>
