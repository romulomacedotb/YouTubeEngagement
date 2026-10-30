import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { AuthChannelMeResponse, GoogleAuthOptionsResponse } from '@youtube-engagement/shared';
import { apiService } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const authState = ref<AuthChannelMeResponse>({
    authenticated: false,
    message: 'Carregando status...',
  });
  const isLoading = ref(false);
  const isConnectModalOpen = ref(false);
  const authOptions = ref<GoogleAuthOptionsResponse | null>(null);

  async function checkAuth() {
    isLoading.value = true;
    try {
      const res = await apiService.getCurrentChannel();
      authState.value = res;
    } catch {
      authState.value = {
        authenticated: false,
        message: 'Não autenticado',
      };
    } finally {
      isLoading.value = false;
    }
  }

  async function logout() {
    isLoading.value = true;
    try {
      await apiService.logout();
      authState.value = {
        authenticated: false,
        message: 'Sessão encerrada.',
      };
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * Starts connection flow:
   * - If a default configuration exists, redirects immediately without prompting.
   * - If no default exists, opens the credential selection modal.
   */
  async function startConnectFlow() {
    isLoading.value = true;
    try {
      const options = await apiService.getGoogleAuthOptions();
      authOptions.value = options;

      // If a default config is set, use it directly without asking
      if (options.defaultConfigId) {
        window.location.href = `/api/auth/google?clientConfigId=${options.defaultConfigId}`;
        return;
      }

      // Otherwise, open the modal to let the user select
      isConnectModalOpen.value = true;
    } catch (err: any) {
      console.error('Falha ao verificar opções de autenticação:', err);
      // Fallback to default google endpoint
      window.location.href = '/api/auth/google';
    } finally {
      isLoading.value = false;
    }
  }

  function connectWithClient(clientConfigId?: string) {
    if (clientConfigId) {
      window.location.href = `/api/auth/google?clientConfigId=${clientConfigId}`;
    } else {
      window.location.href = '/api/auth/google';
    }
  }

  function closeConnectModal() {
    isConnectModalOpen.value = false;
  }

  return {
    authState,
    isLoading,
    isConnectModalOpen,
    authOptions,
    checkAuth,
    logout,
    startConnectFlow,
    connectWithClient,
    closeConnectModal,
  };
});
