<template>
  <div class="glass-card p-5 rounded-2xl relative overflow-hidden transition-all duration-300 hover:border-slate-600/50 hover:shadow-lg hover:shadow-red-950/10 group">
    <div class="flex items-center justify-between">
      <div>
        <p class="text-xs font-medium uppercase tracking-wider text-slate-400">{{ title }}</p>
        <p class="mt-2 text-2xl font-bold tracking-tight text-white flex items-baseline gap-2">
          {{ value }}
          <span v-if="subtitle" class="text-xs font-normal text-slate-400">({{ subtitle }})</span>
        </p>
      </div>
      <div :class="['w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110', iconBg]">
        <slot name="icon"></slot>
      </div>
    </div>
    <div v-if="$slots.footer" class="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
      <slot name="footer"></slot>
    </div>
    <div class="absolute -right-6 -bottom-6 w-24 h-24 rounded-full blur-2xl opacity-10 pointer-events-none" :class="glowColor"></div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    title: string;
    value: string | number;
    subtitle?: string;
    iconBg?: string;
    glowColor?: string;
  }>(),
  {
    iconBg: 'bg-red-500/10 text-red-400',
    glowColor: 'bg-red-500'
  }
);
</script>
