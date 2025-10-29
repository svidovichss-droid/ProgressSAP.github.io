import { CalculatorComponent } from './components/calculatorComponent.js';
import { SearchComponent } from './components/searchComponent.js';
import { ProductService } from './services/productService.js';
import { 
  showNotification, 
  registerServiceWorker, 
  setupThemeToggle,
  checkOnlineStatus 
} from './utils/helpers.js';

/**
 * Основной класс приложения
 */
class App {
  constructor() {
    this.state = {
      products: new Map(),
      lastUpdate: null,
      isOnline: true,
      isLoading: true
    };
    
    this.services = {
      productService: new ProductService()
    };
    
    this.components = {};
    
    this.init();
  }

  /**
   * Инициализация приложения
   */
  async init() {
    console.group('🚀 Инициализация приложения');
    
    try {
      // Инициализация Service Worker
      await registerServiceWorker();
      
      // Настройка темы
      setupThemeToggle();
      
      // Инициализация компонентов
      this.initComponents();
      
      // Загрузка данных
      await this.loadProductsData();
      
      // Настройка обработчиков событий
      this.bindEvents();
      
      // Обновление UI
      this.updateUI();
      
      console.log('🎉 Приложение успешно инициализировано');
      
    } catch (error) {
      console.error('💥 Ошибка инициализации приложения:', error);
      showNotification('Ошибка загрузки приложения', 'error');
    }
    
    console.groupEnd();
  }

  /**
   * Инициализация компонентов
   */
  initComponents() {
    console.log('🔧 Инициализация компонентов...');
    
    // Компонент поиска
    this.components.search = new SearchComponent({
      minQueryLength: 2,
      maxResults: 10,
      debounceDelay: 300,
      onProductSelect: this.handleProductSelect.bind(this)
    });
    
    // Компонент калькулятора
    this.components.calculator = new CalculatorComponent({
      onStandardNotification: this.handleStandardNotification.bind(this)
    });
    
    // Вставка компонентов в DOM
    const searchContainer = document.getElementById('productSearch');
    if (searchContainer && searchContainer.parentNode) {
      searchContainer.parentNode.replaceChild(
        this.components.search.getElement(), 
        searchContainer
      );
    }
    
    const calculatorContainer = document.querySelector('.product-fields-grid');
    if (calculatorContainer && calculatorContainer.parentNode) {
      calculatorContainer.parentNode.replaceChild(
        this.components.calculator.getElement(),
        calculatorContainer
      );
    }
    
    console.log('✅ Компоненты инициализированы');
  }

  /**
   * Загрузка данных о продуктах
   */
  async loadProductsData() {
    console.group('🚀 Загрузка данных приложения');
    
    try {
      // Показываем статус загрузки
      this.showLoadingState(true);
      
      // Тестируем доступность данных перед загрузкой
      console.log('🧪 Тестирование источников данных...');
      const testResults = await this.services.productService.testDataAvailability();
      
      // Находим рабочий источник
      const workingSource = testResults.find(result => result.ok);
      if (workingSource) {
        console.log(`✅ Рабочий источник: ${workingSource.url}`);
      } else {
        console.warn('⚠️ Нет рабочих источников, используется fallback');
      }
      
      // Загружаем продукты
      const products = await this.services.productService.loadProducts();
      this.state.products = products;
      this.state.lastUpdate = new Date();
      
      this.updateProductsCount();
      this.updateLastUpdateInfo();
      this.showLoadingState(false);
      
      // Показываем диагностику
      const diagnostics = this.services.productService.getDiagnostics();
      console.log('📊 Диагностика:', diagnostics);
      
      // Активируем поиск после загрузки данных
      this.activateSearch();
      
      console.log('🎉 Данные приложения успешно загружены');
      console.groupEnd();
      
    } catch (error) {
      console.error('💥 Критическая ошибка загрузки продуктов:', error);
      this.showLoadingState(false);
      
      // Детализированная обработка ошибок
      let errorMessage = 'Не удалось загрузить данные о продуктах';
      
      if (error.message.includes('timeout')) {
        errorMessage = 'Таймаут при загрузке данных. Проверьте подключение к интернету.';
      } else if (error.message.includes('HTTP')) {
        errorMessage = 'Ошибка сервера при загрузке данных.';
      } else if (error.message.includes('JSON')) {
        errorMessage = 'Некорректный формат данных. Проверьте файл data.json.';
      } else if (error.message.includes('Все источники')) {
        errorMessage = 'Все источники данных недоступны. Проверьте подключение.';
      }
      
      showNotification(errorMessage, 'error');
      
      // Все равно обновляем UI с тем, что есть
      this.updateProductsCount();
      this.updateLastUpdateInfo();
      this.activateSearch();
      console.groupEnd();
    }
  }

  /**
   * Активация поиска после загрузки данных
   */
  activateSearch() {
    const searchInput = document.querySelector('#productSearch');
    if (searchInput) {
      searchInput.disabled = false;
      searchInput.placeholder = 'Введите код или название продукта...';
    }
    
    // Показываем уведомление о готовности
    const productsCount = this.state.products.size;
    if (productsCount > 0) {
      showNotification(`База данных загружена (${productsCount} продуктов)`, 'success', 3000);
    }
  }

  /**
   * Показать/скрыть состояние загрузки
   */
  showLoadingState(show) {
    const dataStatus = document.getElementById('dataStatus');
    const searchInput = document.querySelector('#productSearch');
    
    if (dataStatus) {
      dataStatus.style.display = show ? 'block' : 'none';
    }
    
    if (searchInput) {
      searchInput.disabled = show;
    }
    
    this.state.isLoading = show;
  }

  /**
   * Обновление счетчика продуктов
   */
  updateProductsCount() {
    const countElement = document.getElementById('productsCount');
    if (countElement) {
      countElement.textContent = this.state.products.size;
    }
  }

  /**
   * Обновление информации о последнем обновлении
   */
  updateLastUpdateInfo() {
    const lastUpdateElement = document.getElementById('lastUpdate');
    const lastUpdateTimeElement = document.getElementById('lastUpdateTime');
    const lastUpdateInfoElement = document.getElementById('lastUpdateInfo');
    
    if (this.state.lastUpdate) {
      const timeString = this.state.lastUpdate.toLocaleTimeString('ru-RU');
      const dateString = this.state.lastUpdate.toLocaleDateString('ru-RU');
      
      if (lastUpdateElement) {
        lastUpdateElement.textContent = timeString;
      }
      
      if (lastUpdateTimeElement) {
        lastUpdateTimeElement.textContent = `${dateString} ${timeString}`;
      }
      
      if (lastUpdateInfoElement) {
        lastUpdateInfoElement.classList.remove('hidden');
      }
    }
  }

  /**
   * Обновление статуса онлайн/оффлайн
   */
  updateOnlineStatus() {
    const cacheStatusElement = document.getElementById('cacheStatus');
    const offlineStatusElement = document.getElementById('offlineStatus');
    
    this.state.isOnline = checkOnlineStatus();
    
    if (cacheStatusElement) {
      cacheStatusElement.textContent = this.state.isOnline ? 'Онлайн' : 'Оффлайн';
      cacheStatusElement.className = this.state.isOnline ? 
        'stat-value text-2xl font-bold text-green-600 dark:text-green-400' : 
        'stat-value text-2xl font-bold text-yellow-600 dark:text-yellow-400';
    }
    
    if (offlineStatusElement) {
      offlineStatusElement.style.display = this.state.isOnline ? 'none' : 'block';
    }
  }

  /**
   * Обработчик выбора продукта
   */
  handleProductSelect(product) {
    console.log('🎯 Выбран продукт:', product);
    
    if (this.components.calculator) {
      this.components.calculator.setProduct(product);
    }
    
    // Прокрутка к калькулятору
    setTimeout(() => {
      const calculatorSection = document.querySelector('.calculator-card');
      if (calculatorSection) {
        calculatorSection.scrollIntoView({ 
          behavior: 'smooth', 
          block: 'start' 
        });
      }
    }, 100);
  }

  /**
   * Обработчик уведомления о стандарте
   */
  handleStandardNotification(standard) {
    const container = document.getElementById('standardNotificationContainer');
    if (!container || !standard) return;
    
    container.innerHTML = `
      <div class="bg-yellow-50 border border-yellow-200 rounded-lg p-4 dark:bg-yellow-900 dark:border-yellow-700">
        <div class="flex items-center">
          <i class="fas fa-file-contract text-yellow-600 text-lg mr-3 dark:text-yellow-300"></i>
          <div>
            <p class="text-yellow-700 font-medium text-sm dark:text-yellow-300">Стандарт качества</p>
            <p class="text-yellow-600 text-xs mt-1 dark:text-yellow-400">${standard}</p>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Привязка обработчиков событий
   */
  bindEvents() {
    // Обновление данных
    const refreshButton = document.getElementById('refreshFooterButton');
    if (refreshButton) {
      refreshButton.addEventListener('click', this.handleRefresh.bind(this));
    }
    
    // Онлайн/оффлайн события
    window.addEventListener('online', this.handleOnlineStatusChange.bind(this));
    window.addEventListener('offline', this.handleOnlineStatusChange.bind(this));
    
    // Глобальные горячие клавиши
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  /**
   * Обработчик обновления данных
   */
  async handleRefresh() {
    try {
      showNotification('Обновление данных...', 'info');
      
      await this.services.productService.forceRefresh();
      await this.loadProductsData();
      
    } catch (error) {
      console.error('❌ Ошибка обновления:', error);
      showNotification('Ошибка при обновлении данных', 'error');
    }
  }

  /**
   * Обработчик изменения онлайн статуса
   */
  handleOnlineStatusChange() {
    this.updateOnlineStatus();
    
    if (this.state.isOnline) {
      showNotification('Подключение восстановлено', 'success', 3000);
      // Автоматическая синхронизация при появлении сети
      setTimeout(() => {
        this.services.productService.synchronize().then(success => {
          if (success) {
            this.loadProductsData();
          }
        });
      }, 2000);
    } else {
      showNotification('Автономный режим', 'warning', 3000);
    }
  }

  /**
   * Глобальные горячие клавиши
   */
  handleGlobalKeydown(event) {
    // Ctrl + R - обновление данных
    if (event.ctrlKey && event.key === 'r') {
      event.preventDefault();
      this.handleRefresh();
    }
    
    // Ctrl + F - фокус на поиск
    if (event.ctrlKey && event.key === 'f') {
      event.preventDefault();
      if (this.components.search) {
        this.components.search.focus();
      }
    }
  }

  /**
   * Обновление UI
   */
  updateUI() {
    this.updateOnlineStatus();
    this.updateProductsCount();
    this.updateLastUpdateInfo();
  }

  /**
   * Получение состояния приложения
   */
  getState() {
    return { ...this.state };
  }
}

// Инициализация приложения при загрузке DOM
document.addEventListener('DOMContentLoaded', () => {
  window.app = new App();
});

// Глобальные функции для обратной совместимости
window.showNotification = showNotification;
