/**
 * Показать уведомление
 */
export function showNotification(message, type = 'info', duration = 5000) {
  const container = document.getElementById('notificationContainer') || createNotificationContainer();
  
  const notification = document.createElement('div');
  notification.className = `notification-message fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg text-white font-medium z-50 transition-all duration-300 transform translate-x-0 opacity-100 ${
    type === 'success' ? 'bg-green-500' : 
    type === 'warning' ? 'bg-yellow-500' : 
    type === 'info' ? 'bg-blue-500' : 'bg-red-500'
  }`;
  notification.setAttribute('aria-live', 'assertive');
  notification.innerHTML = `
  <div class="flex items-center">
    <i class="fas ${
        type === 'success' ? 'fa-check-circle' : 
        type === 'warning' ? 'fa-exclamation-triangle' : 
        type === 'info' ? 'fa-info-circle' : 'fa-exclamation-circle'
    } mr-2"></i>
    ${message}
  </div>
  `;
  
  container.appendChild(notification);

  setTimeout(() => {
    notification.classList.add('translate-x-full', 'opacity-0');
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 300);
  }, duration);
}

/**
 * Создать контейнер для уведомлений
 */
function createNotificationContainer() {
  const container = document.createElement('div');
  container.id = 'notificationContainer';
  container.className = 'fixed top-4 right-4 z-50 space-y-2 max-w-sm';
  document.body.appendChild(container);
  return container;
}

/**
 * Форматирование даты
 */
export function formatDate(date, format = 'DD.MM.YYYY') {
  if (!(date instanceof Date) || isNaN(date)) {
    return 'Некорректная дата';
  }
  
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  
  return format
    .replace('DD', day)
    .replace('MM', month)
    .replace('YYYY', year);
}

/**
 * Дебаунс функции
 */
export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

/**
 * Подсветка текста в результатах поиска
 */
export function highlightText(text, query) {
  if (!query) return text;
  
  const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
  return text.replace(regex, '<mark class="bg-yellow-200 dark:bg-yellow-600">$1</mark>');
}

/**
 * Экранирование regex символов
 */
function escapeRegex(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Регистрация Service Worker
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      // Регистрируем Service Worker из корня
      const registration = await navigator.serviceWorker.register('/service-worker.js', {
        scope: '/'
      });
      
      console.log('✅ Service Worker зарегистрирован:', registration);
      
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        console.log('🔄 Обнаружено обновление Service Worker');
        
        newWorker.addEventListener('statechange', () => {
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showNotification('Доступно обновление приложения', 'info');
          }
        });
      });
      
      return registration;
      
    } catch (error) {
      console.error('❌ Ошибка регистрации Service Worker:', error);
      // Не блокируем приложение при ошибке SW
      return null;
    }
  }
  return null;
}

/**
 * Настройка переключения темы
 */
export function setupThemeToggle() {
  const toggleBtn = document.getElementById('themeToggle');
  const currentTheme = localStorage.getItem('theme') || 'light';
  
  document.documentElement.setAttribute('data-theme', currentTheme);
  
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const newTheme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

/**
 * Проверка онлайн статуса
 */
export function checkOnlineStatus() {
  return navigator.onLine;
}

/**
 * Копирование текста в буфер обмена
 */
export async function copyToClipboard(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      return true;
    }
  } catch (error) {
    console.error('❌ Copy failed:', error);
    return false;
  }
}

// Глобальная функция для обратной совместимости
window.showNotification = showNotification;
