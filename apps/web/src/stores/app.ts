import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { HealthCheckResponse } from '@youtube-engagement/shared';
import { apiService } from '../services/api';

export const useAppStore = defineStore('app', () => {
  const health = ref<HealthCheckResponse | null>(null);
  const isLoadingHealth = ref(false);
  const healthError = ref<string | null>(null);
  const isOnline = ref(navigator.onLine);

  const deferredPrompt = ref<any>(null);
  const canInstallPwa = ref(false);

  // Toast state
  const toast = ref<{ message: string; type: 'success' | 'error' | 'info'; visible: boolean }>({
    message: '',
    type: 'info',
    visible: false
  });
  let toastTimer: any = null;

  function showToast(message: string, type: 'success' | 'error' | 'info' = 'info', duration = 3500) {
    if (toastTimer) clearTimeout(toastTimer);
    toast.value = { message, type, visible: true };
    toastTimer = setTimeout(() => {
      toast.value.visible = false;
    }, duration);
  }

  // Monitor connectivity
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline.value = true;
      showToast('Conexão restabelecida! Você está online.', 'success');
    });
    window.addEventListener('offline', () => {
      isOnline.value = false;
      showToast('Você está desconectado. Modo offline ativado.', 'info');
    });

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      deferredPrompt.value = e;
      canInstallPwa.value = true;
    });

    window.addEventListener('appinstalled', () => {
      deferredPrompt.value = null;
      canInstallPwa.value = false;
      showToast('Aplicativo instalado com sucesso!', 'success');
    });
  }

  async function promptInstall() {
    if (!deferredPrompt.value) return;
    deferredPrompt.value.prompt();
    const { outcome } = await deferredPrompt.value.userChoice;
    if (outcome === 'accepted') {
      canInstallPwa.value = false;
    }
    deferredPrompt.value = null;
  }

  async function checkHealth() {
    isLoadingHealth.value = true;
    healthError.value = null;
    try {
      health.value = await apiService.getHealth();
    } catch (err: any) {
      healthError.value = err.message || 'Falha ao conectar com o backend';
      health.value = null;
    } finally {
      isLoadingHealth.value = false;
    }
  }

  return {
    health,
    isLoadingHealth,
    healthError,
    isOnline,
    toast,
    canInstallPwa,
    showToast,
    promptInstall,
    checkHealth
  };
});
