<template>
  <div v-if="visible" class="notification" :class="type">
    <div class="notification-content">
      <div class="notification-icon">
        <CircleCheck v-if="type === 'success'" :size="20" />
        <CircleX v-else-if="type === 'error'" :size="20" />
        <Info v-else :size="20" />
      </div>
      <div class="notification-message">{{ message }}</div>
      <n-button class="notification-close" @click="close" quaternary circle size="small" type="default">
        <X :size="16" />
      </n-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { CircleCheck, CircleX, Info, X } from '@lucide/vue';
import { ref, onMounted, onUnmounted } from 'vue';
import { NButton } from 'naive-ui';

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  type: {
    type: String,
    default: 'info',
    validator: (value: string) => ['success', 'error', 'info'].includes(value)
  },
  duration: {
    type: Number,
    default: 3000 // Automatically closes after 3 seconds by default
  }
});

const emit = defineEmits(['close']);

const visible = ref(false);
let timer: number | null = null;

const close = () => {
  visible.value = false;
  emit('close');
};

const startTimer = () => {
  if (props.duration > 0) {
    timer = window.setTimeout(() => {
      close();
    }, props.duration);
  }
};

const clearTimer = () => {
  if (timer) {
    clearTimeout(timer);
    timer = null;
  }
};

onMounted(() => {
  visible.value = true;
  startTimer();
});

onUnmounted(() => {
  clearTimer();
});
</script>

<style scoped>
.notification {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  min-width: 300px;
  max-width: 500px;
  padding: 16px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  transform: translateX(0);
  opacity: 1;
}

.notification.success {
  background-color: #f6ffed;
  border: 1px solid #b7eb8f;
  color: #52c41a;
}

.notification.error {
  background-color: #fff2f0;
  border: 1px solid #ffccc7;
  color: #ff4d4f;
}



.notification-content {
  display: flex;
  align-items: center;
}

.notification-icon {
  margin-right: 12px;
  flex-shrink: 0;
}

.notification-message {
  flex: 1;
  font-size: 14px;
  line-height: 1.5;
}

.notification-close {
  margin-left: 12px;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  color: inherit;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.notification-close:hover {
  opacity: 1;
}
</style>