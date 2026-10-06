import { h, ref, render } from 'vue';
import { CircleCheck, CircleX, Info, TriangleAlert, X } from '@lucide/vue';

interface NotificationItem {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
}

const notifications = ref<NotificationItem[]>([]);
let nextId = 1;

// Create the notification container
const createNotificationContainer = () => {
  // Check whether a notification container already exists
  let container = document.getElementById('notification-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notification-container';
    container.style.position = 'fixed';
    container.style.top = '20px';
    container.style.right = '20px';
    container.style.zIndex = '9999';
    document.body.appendChild(container);
  }
  return container;
};

// Create the notification element
const createNotificationElement = (notification: NotificationItem) => {
  const container = createNotificationContainer();
  
  const notificationElement = document.createElement('div');
  notificationElement.className = `notification notification-${notification.type}`;
  const borderColor =
    notification.type === 'success'
      ? '#52c41a'
      : notification.type === 'error'
      ? '#ff4d4f'
      : notification.type === 'warning'
      ? '#faad14'
      : '#1890ff';
  notificationElement.style.cssText = `
    position: relative;
    margin-bottom: 10px;
    padding: 12px 16px;
    border-radius: 4px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    background-color: #fff;
    min-width: 300px;
    max-width: 500px;
    animation: slideIn 0.3s ease-out;
    border-left: 4px solid ${borderColor};
  `;
  
  const contentElement = document.createElement('div');
  contentElement.className = 'notification-content';
  contentElement.style.cssText = `
    display: flex;
    align-items: center;
  `;
  
  const iconElement = document.createElement('div');
  iconElement.className = 'notification-icon';
  iconElement.style.cssText = `
    display: flex;
    margin-right: 8px;
    color: ${borderColor};
  `;
  const typeIcon =
    notification.type === 'success'
      ? CircleCheck
      : notification.type === 'error'
      ? CircleX
      : notification.type === 'warning'
      ? TriangleAlert
      : Info;
  render(h(typeIcon, { size: 16 }), iconElement);
  
  const messageElement = document.createElement('div');
  messageElement.className = 'notification-message';
  messageElement.style.cssText = `
    flex: 1;
    font-size: 14px;
    color: #333;
  `;
  messageElement.textContent = notification.message;
  
  const closeElement = document.createElement('button');
  closeElement.className = 'notification-close';
  closeElement.style.cssText = `
    background: none;
    border: none;
    cursor: pointer;
    color: #999;
    padding: 0;
    margin-left: 8px;
    display: flex;
  `;
  render(h(X, { size: 16 }), closeElement);
  closeElement.onclick = () => {
    container.removeChild(notificationElement);
    removeNotification(notification.id);
  };
  
  contentElement.appendChild(iconElement);
  contentElement.appendChild(messageElement);
  contentElement.appendChild(closeElement);
  notificationElement.appendChild(contentElement);
  
  container.appendChild(notificationElement);
  
  // Auto-close
  if (notification.duration && notification.duration > 0) {
    setTimeout(() => {
      if (container.contains(notificationElement)) {
        container.removeChild(notificationElement);
        removeNotification(notification.id);
      }
    }, notification.duration);
  }
  
  return notificationElement;
};

// Remove a notification
const removeNotification = (id: number) => {
  const index = notifications.value.findIndex(n => n.id === id);
  if (index !== -1) {
    notifications.value.splice(index, 1);
  }
};

// Show a notification
const showNotification = (
  message: string, 
  type: 'success' | 'error' | 'info' | 'warning' = 'info',
  duration = 3000
) => {
  const notification: NotificationItem = {
    id: nextId++,
    message,
    type,
    duration
  };
  
  notifications.value.push(notification);
  createNotificationElement(notification);
  
  return notification.id;
};

// Success notification
const success = (message: string, duration?: number) => {
  return showNotification(message, 'success', duration);
};

// Error notification
const error = (message: string, duration?: number) => {
  return showNotification(message, 'error', duration);
};

// Info notification
const info = (message: string, duration?: number) => {
  return showNotification(message, 'info', duration);
};

// Warning notification
const warning = (message: string, duration?: number) => {
  return showNotification(message, 'warning', duration);
};

export default {
  show: showNotification,
  success,
  error,
  info,
  warning
};