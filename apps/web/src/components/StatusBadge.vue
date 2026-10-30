<template>
  <span
    :class="[
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors',
      badgeStyles[type] || badgeStyles.neutral
    ]"
  >
    <span :class="['w-1.5 h-1.5 rounded-full', dotStyles[type] || dotStyles.neutral]"></span>
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    type?: 'success' | 'warning' | 'error' | 'info' | 'neutral';
    label?: string;
  }>(),
  {
    type: 'neutral',
    label: ''
  }
);

const badgeStyles = {
  success: 'bg-emerald-950/60 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-950/60 text-amber-300 border-amber-500/30',
  error: 'bg-rose-950/60 text-rose-300 border-rose-500/30',
  info: 'bg-sky-950/60 text-sky-300 border-sky-500/30',
  neutral: 'bg-slate-800/60 text-slate-300 border-slate-700/50'
};

const dotStyles = {
  success: 'bg-emerald-400 animate-pulse',
  warning: 'bg-amber-400',
  error: 'bg-rose-400',
  info: 'bg-sky-400',
  neutral: 'bg-slate-400'
};
</script>
