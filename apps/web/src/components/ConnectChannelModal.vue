<template>
  <Teleport to="body">
    <div
      v-if="authStore.isConnectModalOpen"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto bg-slate-950/80 backdrop-blur-sm transition-all"
    >
      <div
        class="glass-card w-full max-w-lg rounded-3xl border border-slate-700/70 p-6 sm:p-8 shadow-2xl relative bg-slate-900/95 space-y-6 animate-in fade-in zoom-in-95 duration-150"
      >
        <!-- Close button -->
        <button
          @click="authStore.closeConnectModal()"
          class="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-xl hover:bg-slate-800 transition"
        >
          <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <!-- Header -->
        <div class="space-y-1.5 pr-8">
          <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 text-brand-400 text-xs font-semibold border border-brand-500/20">
            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.761H12.545z"/>
            </svg>
            <span>Google OAuth 2.0</span>
          </div>
          <h3 class="text-xl font-bold text-white tracking-tight">Escolha o Canal / Credencial</h3>
          <p class="text-xs text-slate-400">
            Selecione qual aplicação do Google Cloud você deseja utilizar para autenticar o canal.
          </p>
        </div>

        <!-- Registered Clients List -->
        <div v-if="clients.length > 0" class="space-y-3 max-h-72 overflow-y-auto pr-1">
          <div
            v-for="client in clients"
            :key="client.id"
            class="p-4 rounded-2xl bg-slate-800/70 border border-slate-700/80 hover:border-brand-500/50 hover:bg-slate-800 transition flex items-center justify-between gap-4 group"
          >
            <div class="min-w-0">
              <div class="flex items-center gap-2">
                <span class="text-sm font-semibold text-white truncate">{{ client.name }}</span>
                <span
                  v-if="client.isDefault"
                  class="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                >
                  Padrão
                </span>
              </div>
              <p class="text-[11px] font-mono text-slate-400 truncate mt-0.5" :title="client.clientId">
                {{ formatClientId(client.clientId) }}
              </p>
            </div>

            <button
              @click="authStore.connectWithClient(client.id)"
              class="flex-shrink-0 px-3.5 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold shadow-md shadow-brand-950/40 transition flex items-center gap-1.5"
            >
              <span>Conectar</span>
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </button>
          </div>
        </div>

        <!-- No credentials registered -->
        <div v-else class="p-5 rounded-2xl bg-slate-800/40 border border-slate-800 text-center space-y-3">
          <div class="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mx-auto border border-amber-500/20">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div>
            <h4 class="text-sm font-semibold text-white">Nenhuma credencial cadastrada</h4>
            <p class="text-xs text-slate-400 mt-1">
              Cadastre suas credenciais (Client ID e Secret) na tela de Configurações para poder conectar seus canais com facilidade.
            </p>
          </div>

          <div class="pt-2 flex flex-col sm:flex-row items-center justify-center gap-2">
            <button
              v-if="authStore.authOptions?.hasEnvFallback"
              @click="authStore.connectWithClient()"
              class="w-full sm:w-auto px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition"
            >
              Conectar com credencial do .env
            </button>
            <router-link
              to="/settings"
              @click="authStore.closeConnectModal()"
              class="w-full sm:w-auto px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-semibold transition"
            >
              Cadastrar em Configurações
            </router-link>
          </div>
        </div>

        <!-- Footer actions & Dev login -->
        <div class="pt-4 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <router-link
            to="/settings"
            @click="authStore.closeConnectModal()"
            class="text-brand-400 hover:text-brand-300 font-medium flex items-center gap-1.5 transition"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span>Gerenciar credenciais nas Configurações</span>
          </router-link>

          <a
            href="/api/auth/dev-login"
            class="text-slate-500 hover:text-slate-400 transition"
            title="Usar canal mock para desenvolvimento sem credencial real"
          >
            Usar Canal de Teste (Dev)
          </a>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from '../stores/auth';

const authStore = useAuthStore();

const clients = computed(() => {
  return authStore.authOptions?.clients || [];
});

function formatClientId(id: string): string {
  if (id.length <= 25) return id;
  return `${id.slice(0, 15)}...${id.slice(-10)}`;
}
</script>
