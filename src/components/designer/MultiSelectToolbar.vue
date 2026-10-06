<template>
  <div class="multi-select-toolbar" v-if="visible">
    <div class="toolbar-group">
      <span class="toolbar-label">{{ $t("multiSelect.align") }}</span>
      <button class="toolbar-btn" :title="$t('alignment.left')" @click="$emit('align', 'left')">
        <AlignStartVertical :size="14" />
      </button>
      <button class="toolbar-btn" :title="$t('alignment.centerH')" @click="$emit('align', 'center')">
        <AlignCenterVertical :size="14" />
      </button>
      <button class="toolbar-btn" :title="$t('alignment.right')" @click="$emit('align', 'right')">
        <AlignEndVertical :size="14" />
      </button>
      <span class="toolbar-divider"></span>
      <button class="toolbar-btn" :title="$t('alignment.top')" @click="$emit('align', 'top')">
        <AlignStartHorizontal :size="14" />
      </button>
      <button class="toolbar-btn" :title="$t('alignment.middle')" @click="$emit('align', 'middle')">
        <AlignCenterHorizontal :size="14" />
      </button>
      <button class="toolbar-btn" :title="$t('alignment.bottom')" @click="$emit('align', 'bottom')">
        <AlignEndHorizontal :size="14" />
      </button>
    </div>

    <div class="toolbar-group">
      <span class="toolbar-label">{{ $t("multiSelect.distribute") }}</span>
      <button class="toolbar-btn" :title="$t('multiSelect.distributeH')" @click="$emit('distribute', 'horizontal')">
        <AlignHorizontalDistributeCenter :size="14" />
      </button>
      <button class="toolbar-btn" :title="$t('multiSelect.distributeV')" @click="$emit('distribute', 'vertical')">
        <AlignVerticalDistributeCenter :size="14" />
      </button>
    </div>

    <div class="toolbar-group">
      <span class="toolbar-label">{{ $t("multiSelect.size") }}</span>
      <button class="toolbar-btn" :title="$t('multiSelect.sameWidth')" @click="$emit('resize', 'sameWidth')">W</button>
      <button class="toolbar-btn" :title="$t('multiSelect.sameHeight')" @click="$emit('resize', 'sameHeight')">H</button>
      <button class="toolbar-btn" :title="$t('multiSelect.sameSize')" @click="$emit('resize', 'sameSize')">
        <Scaling :size="14" />
      </button>
    </div>

    <span class="toolbar-divider"></span>
    <span class="toolbar-info">{{ $t("multiSelect.selectedCount", { count }) }}</span>
  </div>
</template>

<script setup lang="ts">
import {
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  Scaling,
} from "@lucide/vue";

defineProps<{
  visible: boolean;
  count: number;
}>();

defineEmits<{
  (e: 'align', direction: 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom'): void;
  (e: 'distribute', direction: 'horizontal' | 'vertical'): void;
  (e: 'resize', type: 'sameWidth' | 'sameHeight' | 'sameSize'): void;
}>();
</script>

<style scoped>
.multi-select-toolbar {
  position: absolute;
  top: -40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 4px;
  background: #2c2c2c;
  color: #fff;
  padding: 4px 8px;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  z-index: 100;
  white-space: nowrap;
  font-size: 12px;
}

.toolbar-group {
  display: flex;
  align-items: center;
  gap: 2px;
}

.toolbar-label {
  font-size: 11px;
  color: #aaa;
  margin-right: 4px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  height: 26px;
  border: none;
  background: transparent;
  color: #ddd;
  cursor: pointer;
  border-radius: 4px;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.15s;
}

.toolbar-btn:hover {
  background: #444;
  color: #fff;
}

.toolbar-btn:active {
  background: #4a90e2;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: #555;
  margin: 0 4px;
}

.toolbar-info {
  font-size: 11px;
  color: #999;
  margin-left: 4px;
}
</style>
