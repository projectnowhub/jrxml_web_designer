<template>
  <div class="column-tree-node" :style="{ marginLeft: depth > 0 ? '16px' : '0' }">
    <!-- Node header -->
    <div
      class="column-tree-node-header"
      :class="{ group: isGroup, 'last-sibling': isLast }"
    >
      <!-- Expand/collapse button (groups only) -->
      <button
        v-if="isGroup"
        class="column-tree-expand-btn"
        :class="{ collapsed: !expanded }"
        @click="expanded = !expanded"
        :title="expanded ? 'Collapse' : 'Expand'"
      >
        ▶
      </button>
      <span v-else class="column-tree-expand-placeholder"></span>

      <!-- Node type icon -->
      <span class="column-tree-node-icon">
        {{ isGroup ? '▦' : '☰' }}
      </span>

      <!-- Name input -->
      <input
        class="column-tree-node-name"
        :value="node.name"
        @input="handleNameChange(($event.target as HTMLInputElement).value)"
        @blur="handleNameBlur"
        placeholder="Name"
      />

      <!-- Width -->
      <template v-if="isGroup">
        <span class="column-tree-node-width-display" :title="`Width: ${node.width}px (auto-calculated)`">
          {{ node.width }}
        </span>
      </template>
      <template v-else>
        <input
          class="column-tree-node-width"
          type="number"
          :value="(node as Column).width"
          @change="handleWidthChange(($event.target as HTMLInputElement).value)"
          min="1"
          title="Column width (px)"
        />
      </template>

      <!-- Action buttons -->
      <div class="column-tree-node-actions">
        <button
          v-if="canMoveUp"
          class="column-tree-action-btn"
          @click.stop="$emit('move-node', node.uuid, 'up')"
          title="Move up"
        >↑</button>
        <button
          v-if="canMoveDown"
          class="column-tree-action-btn"
          @click.stop="$emit('move-node', node.uuid, 'down')"
          title="Move down"
        >↓</button>
        <button
          v-if="isGroup"
          class="column-tree-action-btn"
          @click.stop="$emit('add-column-child', node.uuid)"
          title="Add column inside group"
        >⊕</button>
        <button
          class="column-tree-action-btn"
          @click.stop="$emit('add-column-after', node.uuid)"
          title="Add column after"
        >+</button>
        <button
          class="column-tree-action-btn"
          @click.stop="$emit('add-column-group-after', node.uuid)"
          title="Add group after"
        >⧉</button>
        <button
          v-if="isGroup"
          class="column-tree-action-btn"
          @click.stop="$emit('ungroup-node', node.uuid)"
          title="Ungroup"
        >⊟</button>
        <button
          class="column-tree-action-btn danger"
          @click.stop="$emit('delete-node', node.uuid)"
          title="Delete"
        >×</button>
      </div>
    </div>

    <!-- Group child nodes -->
    <div v-if="isGroup && expanded" class="column-tree-node-children">
      <ColumnTreeNode
        v-for="(child, idx) in (node as ColumnGroup).children"
        :key="child.uuid || idx"
        :node="child"
        :depth="depth + 1"
        :is-last="idx === (node as ColumnGroup).children.length - 1"
        :parent-uuid="node.uuid"
        :parent-length="(node as ColumnGroup).children.length"
        :sibling-index="idx"
        @update-node="(uuid, updates) => $emit('update-node', uuid, updates)"
        @delete-node="(uuid) => $emit('delete-node', uuid)"
        @add-column-after="(uuid) => $emit('add-column-after', uuid)"
        @add-column-child="(uuid) => $emit('add-column-child', uuid)"
        @add-column-group-after="(uuid) => $emit('add-column-group-after', uuid)"
        @ungroup-node="(uuid) => $emit('ungroup-node', uuid)"
        @move-node="(uuid, dir) => $emit('move-node', uuid, dir)"
      />
      <!-- Empty-group hint -->
      <div v-if="(node as ColumnGroup).children.length === 0" class="column-tree-empty-hint">
        Click ⊕ to add a column inside the group
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Column, ColumnGroup, BaseColumn } from '../../../types/table';

const props = defineProps<{
  node: Column | ColumnGroup;
  depth: number;
  isLast: boolean;
  parentUuid?: string | null;
  parentLength?: number;
  siblingIndex?: number;
}>();

const emit = defineEmits<{
  (e: 'update-node', uuid: string, updates: Partial<BaseColumn>): void;
  (e: 'delete-node', uuid: string): void;
  (e: 'add-column-after', uuid: string): void;
  (e: 'add-column-child', uuid: string): void;
  (e: 'add-column-group-after', uuid: string): void;
  (e: 'ungroup-node', uuid: string): void;
  (e: 'move-node', uuid: string, direction: 'up' | 'down'): void;
}>();

const expanded = ref(true);

const isGroup = computed(() => 'children' in props.node);

const canMoveUp = computed(() => {
  return props.siblingIndex !== undefined && props.siblingIndex > 0;
});

const canMoveDown = computed(() => {
  if (props.siblingIndex === undefined || props.parentLength === undefined) return false;
  return props.siblingIndex < props.parentLength - 1;
});

function handleNameChange(value: string) {
  emit('update-node', props.node.uuid, { name: value });
}

function handleNameBlur() {
  // Trigger a JRXML update
}

function handleWidthChange(value: string) {
  const width = parseInt(value, 10);
  if (!isNaN(width) && width > 0) {
    emit('update-node', props.node.uuid, { width });
  }
}
</script>
