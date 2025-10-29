import { CONFIG } from '../utils/constants.js';
import { showNotification } from '../utils/helpers.js';

/**
 * Сервис для работы с данными продуктов
 */
export class ProductService {
  constructor() {
    this.products = new Map();
    this.isInitialized = false;
    this.currentDataUrl = null;
    this.dataSources = this.getDataSources();
  }

  /**
   * Определение возможных источников данных
   */
  getDataSources() {
    const repoName = 'ProgressSAP.github.io';
    const baseUrl = window.location.origin;
    
    return [
      // 1. Относительный путь (основной)
      './data.json',
      
      // 2. Для GitHub Pages структуры
      `/${repoName}/data.json`,
      
      // 3. Абсолютный путь
      `${baseUrl}/${repoName}/data.json`,
      
      // 4. RAW GitHub URL
      `https://raw.githubusercontent.com/svidovichss-droid/${repoName}/main/data.json`,
      
      // 5. Fallback
      `https://raw.githubusercontent.com/svidovichss-droid/${repoName}/refs/heads/main/data.json`
    ];
  }

  /**
   * Загрузка данных о продуктах
   */
  async loadProducts() {
    console.group('🔄 ProductService: Загрузка данных');
    console.log('📡 Определение источника данных...');
    
    try {
      const isOnline = navigator.onLine;
      console.log('📶 Online статус:', isOnline);
      
      if (isOnline) {
        console.log('🌐 Попытка загрузки из сети...');
        await this.loadFromNetwork();
      } else {
        console.log('💾 Оффлайн режим, загрузка из кэша...');
        await this.loadFromCache();
      }

      console.log(`✅ Успешно загружено продуктов: ${this.products.size}`);
      console.groupEnd();
      return this.products;
      
    } catch (error) {
      console.error('❌ Ошибка загрузки продуктов:', error);
      console.groupEnd();
      
      // Каскадный fallback
      try {
        console.log('🔄 Попытка загрузки из кэша...');
        await this.loadFromCache();
        showNotification('Используются кэшированные данные', 'warning');
      } catch (cacheError) {
        console.log('🔄 Использование fallback данных...');
        await this.loadFallbackData();
      }
      
      return this.products;
    }
  }

  /**
   * Загрузка данных из сети с перебором источников
   */
  async loadFromNetwork() {
    console.group('🌐 Загрузка из сети');
    
    let lastError = null;
    
    // Перебираем все возможные источники данных
    for (const url of this.dataSources) {
      try {
        console.log(`🔍 Попытка загрузки из: ${url}`);
        const data = await this.tryLoadFromUrl(url);
        
        this.currentDataUrl = url;
        console.log(`✅ Успешно загружено из: ${url}`);
        console.groupEnd();
        return data;
        
      } catch (error) {
        console.warn(`❌ Не удалось загрузить из ${url}:`, error.message);
        lastError = error;
        continue; // Пробуем следующий источник
      }
    }
    
    console.error('💥 Все источники данных недоступны');
    console.groupEnd();
    throw lastError || new Error('Все источники данных недоступны');
  }

  /**
   * Попытка загрузки с конкретного URL
   */
  async tryLoadFromUrl(url) {
    console.log(`📡 Запрос к: ${url}`);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // Увеличил таймаут
    
    try {
      const response = await fetch(url, {
        signal: controller.signal,
        mode: 'cors', // Добавил CORS mode
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache',
          'Accept': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      console.log(`📊 Ответ от ${url}:`, {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        type: response.type,
        url: response.url
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      // Проверяем Content-Type
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('⚠️ Неожиданный Content-Type:', contentType);
        // Но продолжаем, так как некоторые серверы могут не отправлять правильный content-type
      }
      
      const text = await response.text();
      console.log('📄 Полученные данные (первые 500 символов):', text.substring(0, 500));
      
      if (!text.trim()) {
        throw new Error('Пустой ответ от сервера');
      }
      
      let productsData;
      try {
        productsData = JSON.parse(text);
      } catch (parseError) {
        console.error('❌ Ошибка парсинга JSON:', parseError);
        throw new Error(`Невалидный JSON: ${parseError.message}`);
      }
      
      // Валидация структуры данных
      this.validateDataStructure(productsData);
      
      // Обработка данных
      await this.processProductsData(productsData);
      
      // Сохранение в кэш
      this.saveToCache(productsData);
      
      console.log(`✅ Успешно обработано ${productsData.length} продуктов из ${url}`);
      return productsData;
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Таймаут запроса к ${url}`);
      }
      
      throw error;
    }
  }

  /**
   * Валидация структуры данных
   */
  validateDataStructure(data) {
    console.log('🔍 Валидация структуры данных...');
    
    if (!data) {
      throw new Error('Данные отсутствуют');
    }
    
    if (!Array.isArray(data)) {
      throw new Error('Данные должны быть массивом');
    }
    
    if (data.length === 0) {
      console.warn('⚠️ Получен пустой массив продуктов');
    }
    
    // Проверяем первую запись на наличие обязательных полей
    if (data.length > 0) {
      const sample = data[0];
      const requiredFields = ['Код продукции', 'Полное наименование (русское)', 'Срок годности'];
      
      for (const field of requiredFields) {
        if (!(field in sample)) {
          console.warn(`⚠️ Отсутствует поле: ${field}`);
        }
      }
    }
    
    console.log('✅ Структура данных валидна');
  }

  /**
   * Сохранение в кэш
   */
  saveToCache(productsData) {
    try {
      const cacheData = {
        data: productsData,
        timestamp: Date.now(),
        version: CONFIG.VERSION,
        source: this.currentDataUrl
      };
      
      localStorage.setItem(CONFIG.CACHE_KEYS.PRODUCTS, JSON.stringify(cacheData));
      console.log('💾 Данные сохранены в кэш');
      
    } catch (error) {
      console.error('❌ Ошибка сохранения в кэш:', error);
    }
  }

  /**
   * Загрузка данных из кэша
   */
  async loadFromCache() {
    console.group('💾 Загрузка из кэша');
    
    try {
      const cached = localStorage.getItem(CONFIG.CACHE_KEYS.PRODUCTS);
      
      if (!cached) {
        throw new Error('Кэш отсутствует');
      }

      const cacheData = JSON.parse(cached);
      console.log('📅 Время кэша:', new Date(cacheData.timestamp).toLocaleString());
      console.log('🔗 Источник кэша:', cacheData.source);
      
      const isExpired = Date.now() - cacheData.timestamp > CONFIG.CACHE_DURATION;
      
      if (isExpired) {
        console.warn('⚠️ Используются устаревшие кэшированные данные');
        showNotification('Используются устаревшие кэшированные данные', 'warning');
      } else {
        console.log('✅ Кэш актуален');
      }

      await this.processProductsData(cacheData.data);
      console.log('✅ Продукты загружены из кэша');
      console.groupEnd();
      
    } catch (error) {
      console.error('❌ Ошибка загрузки из кэша:', error);
      console.groupEnd();
      throw error;
    }
  }

  /**
   * Загрузка fallback данных
   */
  async loadFallbackData() {
    console.group('🆘 Загрузка fallback данных');
    
    try {
      await this.processProductsData(CONFIG.FALLBACK_DATA);
      console.log('✅ Fallback данные загружены');
      showNotification('Используются резервные данные', 'warning');
      console.groupEnd();
      
    } catch (error) {
      console.error('❌ Ошибка загрузки fallback данных:', error);
      console.groupEnd();
      showNotification('Не удалось загрузить данные о продуктах', 'error');
      throw new Error('Не удалось загрузить данные о продуктах');
    }
  }

  /**
   * Обработка данных продуктов
   */
  async processProductsData(productsData) {
    console.group('🔧 Обработка данных продуктов');
    this.products.clear();

    if (!Array.isArray(productsData)) {
      throw new Error('Неверный формат данных: ожидается массив');
    }

    let validProducts = 0;
    let invalidProducts = 0;

    for (const [index, product] of productsData.entries()) {
      try {
        const normalizedProduct = this.normalizeProduct(product);
        
        // Проверяем обязательные поля
        if (!normalizedProduct.code || !normalizedProduct.name) {
          console.warn(`⚠️ Пропущен продукт ${index}: отсутствуют обязательные поля`, product);
          invalidProducts++;
          continue;
        }
        
        // Проверяем дубликаты
        if (this.products.has(normalizedProduct.code)) {
          console.warn(`⚠️ Дубликат кода продукта: ${normalizedProduct.code}`);
        }
        
        this.products.set(normalizedProduct.code, normalizedProduct);
        validProducts++;
        
      } catch (error) {
        console.warn(`⚠️ Пропущен невалидный продукт ${index}:`, product, error);
        invalidProducts++;
      }
    }

    console.log(`📊 Результат обработки: ${validProducts} валидных, ${invalidProducts} невалидных`);
    
    if (validProducts === 0) {
      throw new Error('Не найдено валидных продуктов в данных');
    }

    console.log('✅ Обработка данных завершена');
    console.groupEnd();
  }

  /**
   * Нормализация данных продукта
   */
  normalizeProduct(product) {
    // Безопасное извлечение данных с преобразованием типов
    const code = String(product['Код продукции'] || '').trim();
    const name = String(product['Полное наименование (русское)'] || '').trim();
    
    // Преобразование срока годности
    let shelfLife = 0;
    const shelfLifeValue = product['Срок годности'];
    if (shelfLifeValue != null) {
      shelfLife = parseInt(shelfLifeValue);
      if (isNaN(shelfLife) || shelfLife < 0) {
        console.warn(`⚠️ Невалидный срок годности: ${shelfLifeValue}`);
        shelfLife = 0;
      }
    }
    
    // Преобразование количества в упаковке
    let quantityPerPack = 0;
    const quantityValue = product['Штук в упаковке'];
    if (quantityValue != null) {
      quantityPerPack = parseInt(quantityValue);
      if (isNaN(quantityPerPack) || quantityPerPack < 0) {
        quantityPerPack = 0;
      }
    }
    
    const barcode = String(product['Штрихкод упаковки'] || '').trim();
    const manufacturer = String(product['Производитель'] || '').trim();
    const standard = String(product['Название стандарта'] || '').trim();

    return {
      code,
      name,
      shelfLife,
      quantityPerPack,
      barcode,
      manufacturer,
      standard,
      lastUpdated: Date.now()
    };
  }

  /**
   * Поиск продуктов
   */
  searchProducts(query) {
    if (!query || query.length < 2) {
      return [];
    }

    const searchTerm = query.toLowerCase().trim();
    const results = [];

    for (const product of this.products.values()) {
      const matchesCode = product.code.toLowerCase().includes(searchTerm);
      const matchesName = product.name.toLowerCase().includes(searchTerm);
      
      if (matchesCode || matchesName) {
        results.push(product);
      }
    }

    // Сортировка по релевантности
    return results.sort((a, b) => {
      const aCodeMatch = a.code.toLowerCase().startsWith(searchTerm);
      const bCodeMatch = b.code.toLowerCase().startsWith(searchTerm);
      
      if (aCodeMatch && !bCodeMatch) return -1;
      if (!aCodeMatch && bCodeMatch) return 1;
      
      // Сортировка по алфавиту
      return a.name.localeCompare(b.name);
    });
  }

  /**
   * Получение продукта по коду
   */
  getProductByCode(code) {
    return this.products.get(code) || null;
  }

  /**
   * Получение всех продуктов
   */
  getAllProducts() {
    return Array.from(this.products.values());
  }

  /**
   * Принудительное обновление данных
   */
  async forceRefresh() {
    console.group('🔄 Принудительное обновление данных');
    
    try {
      showNotification('Обновление данных...', 'info');
      
      // Очищаем кэш
      localStorage.removeItem(CONFIG.CACHE_KEYS.PRODUCTS);
      console.log('🗑️ Кэш очищен');
      
      // Загружаем заново
      await this.loadFromNetwork();
      
      console.log('✅ Данные успешно обновлены');
      showNotification('Данные успешно обновлены', 'success');
      console.groupEnd();
      
      return true;
      
    } catch (error) {
      console.error('❌ Ошибка принудительного обновления:', error);
      showNotification('Ошибка при обновлении данных', 'error');
      console.groupEnd();
      
      throw error;
    }
  }

  /**
   * Синхронизация данных
   */
  async synchronize() {
    if (!navigator.onLine) {
      console.log('📴 Оффлайн режим - пропуск синхронизации');
      return false;
    }

    try {
      console.log('🔄 Синхронизация данных...');
      await this.loadFromNetwork();
      console.log('✅ Данные синхронизированы');
      return true;
    } catch (error) {
      console.error('❌ Ошибка синхронизации:', error);
      return false;
    }
  }

  /**
   * Очистка кэша
   */
  clearCache() {
    localStorage.removeItem(CONFIG.CACHE_KEYS.PRODUCTS);
    this.products.clear();
    console.log('🗑️ Кэш продуктов очищен');
  }

  /**
   * Получение диагностической информации
   */
  getDiagnostics() {
    const cacheData = localStorage.getItem(CONFIG.CACHE_KEYS.PRODUCTS);
    let cacheInfo = null;
    
    if (cacheData) {
      try {
        const parsed = JSON.parse(cacheData);
        cacheInfo = {
          timestamp: new Date(parsed.timestamp).toLocaleString(),
          source: parsed.source,
          dataLength: parsed.data ? parsed.data.length : 0,
          size: new Blob([cacheData]).size
        };
      } catch (error) {
        cacheInfo = { error: error.message };
      }
    }
    
    return {
      currentDataUrl: this.currentDataUrl,
      productsCount: this.products.size,
      cache: cacheInfo,
      dataSources: this.dataSources,
      onlineStatus: navigator.onLine
    };
  }

  /**
   * Тестирование доступности данных
   */
  async testDataAvailability() {
    console.group('🧪 Тестирование доступности данных');
    
    const results = [];
    
    for (const url of this.dataSources) {
      try {
        console.log(`🔍 Тестирование: ${url}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);
        
        const startTime = Date.now();
        const response = await fetch(url, { 
          signal: controller.signal,
          mode: 'cors',
          cache: 'no-cache'
        });
        const endTime = Date.now();
        
        clearTimeout(timeoutId);
        
        let data = null;
        if (response.ok) {
          try {
            const text = await response.text();
            data = JSON.parse(text);
          } catch (parseError) {
            data = { error: parseError.message };
          }
        }
        
        results.push({
          url,
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          responseTime: endTime - startTime,
          data: data && Array.isArray(data) ? 
            { length: data.length, sample: data[0] } : 
            data
        });
        
        console.log(`✅ ${url}: ${response.status} (${endTime - startTime}ms)`);
        
      } catch (error) {
        results.push({
          url,
          error: error.message,
          ok: false
        });
        
        console.log(`❌ ${url}: ${error.message}`);
      }
    }
    
    console.log('📊 Результаты тестирования:', results);
    console.groupEnd();
    
    return results;
  }
}

// Создаем глобальный экземпляр для отладки
window.productService = new ProductService();
