import { h, render } from 'vue';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from '@lucide/vue';
import i18n from '@/i18n';

// Toast messages at the top right: white cards in the app's theme whose
// headline and icon take the type's colour (green success, red error, amber
// warning, purple information), each with a close button. A message
// written "Headline\nExplanation" shows its first line bold and the rest
// under it, smaller. Plain DOM, so any code can show one: notification.success("…").

type NotificationType = 'success' | 'error' | 'info' | 'warning';

const ICONS = { success: CircleCheck, error: CircleX, warning: TriangleAlert, info: Info } as const;

// How long each kind stays (ms) unless the caller says otherwise; 0 = until closed
const DURATIONS: Record<NotificationType, number> = { success: 4000, info: 5000, warning: 7000, error: 8000 };

// At most this many at once: the oldest goes first
const MAX_TOASTS = 4;
const STYLE_ID = 'app-toast-styles';

const CSS = `
#notification-container {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: min(360px, calc(100vw - 32px));
  pointer-events: none;
}
.app-toast {
  --toast-color: #6440f4;
  --toast-soft: #efebfe;
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 12px 12px 14px;
  overflow: hidden;
  border: 1px solid #e6e5ee;
  border-radius: 12px;
  background: #ffffff;
  box-shadow:
    0 12px 32px rgba(23, 20, 44, 0.12),
    0 2px 6px rgba(23, 20, 44, 0.05);
  color: #1c1b26;
  font-family: inherit;
  pointer-events: auto;
  animation: app-toast-in 0.26s cubic-bezier(0.2, 0.8, 0.2, 1);
}
/* Only the headline, the icon and the timer line take the type's colour */
.app-toast.is-success { --toast-color: #15803d; --toast-soft: #dcfce7; }
.app-toast.is-error { --toast-color: #dc2626; --toast-soft: #fee2e2; }
.app-toast.is-warning { --toast-color: #b45309; --toast-soft: #fef3c7; }
.app-toast.is-leaving {
  animation: app-toast-out 0.2s ease-in forwards;
}
.app-toast-icon {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 999px;
  background: var(--toast-soft);
  color: var(--toast-color);
}
.app-toast-message {
  flex: 1;
  min-width: 0;
  padding-top: 4px;
  font-size: 13px;
  line-height: 1.45;
  overflow-wrap: anywhere;
}
.app-toast-title {
  display: block;
  color: var(--toast-color);
  font-weight: 650;
}
.app-toast-detail {
  display: block;
  margin-top: 2px;
  font-size: 12.5px;
  font-weight: 450;
  color: #4b4a5c;
  white-space: pre-line;
}
.app-toast-close {
  display: flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  margin-top: 2px;
  padding: 0;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: #9a98a8;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.app-toast-close:hover {
  background: #f4f3f8;
  color: #1c1b26;
}
.app-toast-close:focus-visible {
  outline: 2px solid #6440f4;
  outline-offset: 1px;
}
/* How long it stays: a thin line along the bottom, paused while hovered */
.app-toast-timer {
  position: absolute;
  left: 0;
  bottom: 0;
  height: 3px;
  width: 100%;
  background: var(--toast-color);
  opacity: 0.45;
  transform-origin: left;
  animation: app-toast-timer linear forwards;
}
.app-toast:hover .app-toast-timer {
  animation-play-state: paused;
}
@keyframes app-toast-in {
  from { opacity: 0; transform: translateX(24px) scale(0.98); }
  to { opacity: 1; transform: none; }
}
@keyframes app-toast-out {
  to { opacity: 0; transform: translateX(24px) scale(0.98); }
}
@keyframes app-toast-timer {
  from { transform: scaleX(1); }
  to { transform: scaleX(0); }
}
@media (prefers-reduced-motion: reduce) {
  .app-toast, .app-toast.is-leaving { animation: none; }
  .app-toast-timer { display: none; }
}
`;

function container(): HTMLElement {
  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
  }
  let box = document.getElementById('notification-container');
  if (!box) {
    box = document.createElement('div');
    box.id = 'notification-container';
    box.setAttribute('aria-live', 'polite');
    document.body.appendChild(box);
  }
  return box;
}

let nextId = 1;

function dismiss(toast: HTMLElement) {
  if (toast.classList.contains('is-leaving')) return;
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (reduced) {
    toast.remove();
    return;
  }
  toast.classList.add('is-leaving');
  toast.addEventListener('animationend', () => toast.remove(), { once: true });
  // Fallback when the animation doesn't run (a hidden tab)
  setTimeout(() => toast.remove(), 400);
}

const showNotification = (message: string, type: NotificationType = 'info', duration = DURATIONS[type]) => {
  const box = container();
  const toast = document.createElement('div');
  toast.className = `app-toast is-${type}`;
  toast.setAttribute('role', type === 'error' ? 'alert' : 'status');

  const icon = document.createElement('span');
  icon.className = 'app-toast-icon';
  render(h(ICONS[type], { size: 16, strokeWidth: 2.25 }), icon);

  // "Headline\nExplanation": the first line bold, the rest under it
  const [headline, ...rest] = message.split('\n');
  const text = document.createElement('div');
  text.className = 'app-toast-message';
  const title = document.createElement('span');
  title.className = 'app-toast-title';
  title.textContent = headline!.trim();
  text.appendChild(title);
  const detail = rest.join('\n').trim();
  if (detail) {
    const line = document.createElement('span');
    line.className = 'app-toast-detail';
    line.textContent = detail;
    text.appendChild(line);
  }

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'app-toast-close';
  const label = i18n.global.t('common.close');
  close.setAttribute('aria-label', label);
  render(h(X, { size: 14, strokeWidth: 2.25 }), close);
  close.onclick = () => dismiss(toast);

  toast.append(icon, text, close);

  // Closes by itself after `duration` (0 = stays); hovering it waits
  if (duration > 0) {
    const bar = document.createElement('span');
    bar.className = 'app-toast-timer';
    bar.style.animationDuration = `${duration}ms`;
    bar.addEventListener('animationend', () => dismiss(toast));
    toast.appendChild(bar);
  }

  box.appendChild(toast);
  const shown = [...box.querySelectorAll<HTMLElement>('.app-toast:not(.is-leaving)')];
  for (const old of shown.slice(0, Math.max(0, shown.length - MAX_TOASTS))) dismiss(old);
  return nextId++;
};

const success = (message: string, duration?: number) => showNotification(message, 'success', duration);
const error = (message: string, duration?: number) => showNotification(message, 'error', duration);
const info = (message: string, duration?: number) => showNotification(message, 'info', duration);
const warning = (message: string, duration?: number) => showNotification(message, 'warning', duration);

export default {
  show: showNotification,
  success,
  error,
  info,
  warning,
};
