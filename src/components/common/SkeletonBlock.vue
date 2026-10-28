<template>
  <div class="skeleton-block" :style="{ width, height, borderRadius: radius }" aria-hidden="true" />
</template>

<script setup lang="ts">
// A grey block that pulses while data loads: the CDP app's Skeleton (shadcn's
// `animate-pulse rounded-md bg-muted`), no package
withDefaults(defineProps<{ width?: string; height?: string; radius?: string }>(), {
  width: "100%",
  height: "12px",
  radius: "6px",
});
</script>

<style scoped>
.skeleton-block {
  flex-shrink: 0;
  background: #eceaf3;
  animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Tailwind's animate-pulse */
@keyframes skeleton-pulse {
  50% {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .skeleton-block {
    animation: none;
  }
}
</style>
