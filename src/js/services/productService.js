import { CONFIG } from '../utils/constants.js';
import { showNotification } from '../utils/helpers.js';

/**
 * Сервис для работы с данными продуктов
 */
export class ProductService {
  constructor() {
    this.products = new Map();
    this.isInitialized = false;
  }

  /**
   * Загрузка данных о продуктах
   */
  async loadProducts() {
    console.log('🔄 Starting data loading process...');
    
    try {
      const isOnline = navigator.onLine;
      console.log('📶 Online status:', isOnline);
      
      if (isOnline) {
        console.log('🌐 Attempting to load from network...');
        await this.loadFromNetwork();
      } else {
        console.log('💾 Offline mode, loading from cache...');
        await this.loadFromCache();
      }

      console.log(`✅ Successfully loaded ${this.products.size} products`);
      return this.products;
      
    } catch (error) {
      console.error('❌ Error loading products:', error);
      console.log('🔄 Falling back to cached or default data...');
      
      // Сначала пробуем кэш, потом fallback
      try {
        await this.loadFromCache();
        showNotification('Используются кэшированные данные', 'warning');
      } catch (cacheError) {
        console.log('❌ Cache also failed, using fallback data...');
        await this.loadFallbackData();
      }
      
      return this.products;
    }
  }

  /**
   * Загрузка данных из сети
   */
  async loadFromNetwork() {
    try {
      console.log('🔍 Fetching data from:', CONFIG.JSON_URL);
      
      // Добавляем таймаут для fetch
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 секунд таймаут
      
      const response = await fetch(CONFIG.JSON_URL, {
        signal: controller.signal,
        cache: 'no-cache',
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);

      console.log('📡 Response status:', response.status, response.statusText);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const productsData = await response.json();
      console.log('📊 Received data:', productsData);
      
      // Проверяем структуру данных
      if (!Array.isArray(productsData)) {
        throw new Error('Invalid data format: expected array');
      }
      
      if (productsData.length === 0) {
        console.warn('⚠️ Received empty products array');
      }

      await this.processProductsData(productsData);
      
      // Сохранение в кэш
      localStorage.setItem(CONFIG.CACHE_KEYS.PRODUCTS, JSON.stringify({
        data: productsData,
        timestamp: Date.now(),
        version: CONFIG.VERSION
      }));

      console.log('✅ Products loaded from network');
      showNotification('Данные успешно загружены', 'success');
      
    } catch (error) {
      console.error('❌ Network load failed:', error);
      
      if (error.name === 'AbortError') {
        throw new Error('Request timeout - network is too slow');
      }
      
      throw error;
    }
  }

  /**
   * Загрузка данных из кэша
   */
  async loadFromCache() {
    try {
      console.log('💾 Checking cache...');
      const cached = localStorage.getItem(CONFIG.CACHE_KEYS.PRODUCTS);
      
      if (!cached) {
        throw new Error('No cached data available');
      }

      const cacheData = JSON.parse(cached);
      console.log('📅 Cache timestamp:', new Date(cacheData.timestamp));
      
      const isExpired = Date.now() - cacheData.timestamp > CONFIG.CACHE_DURATION;
      
      if (isExpired) {
        console.warn('⚠️ Using expired cache data');
        showNotification('Используются устаревшие кэшированные данные', 'warning');
      } else {
        console.log('✅ Cache is fresh');
      }

      await this.processProductsData(cacheData.data);
      console.log('✅ Products loaded from cache');
      
    } catch (error) {
      console.error('❌ Cache load failed:', error);
      throw error;
    }
  }

  /**
   * Загрузка fallback данных
   */
  async loadFallbackData() {
    try {
      console.log('🆘 Loading fallback data...');
      await this.processProductsData(CONFIG.FALLBACK_DATA);
      console.log('✅ Fallback data loaded');
      showNotification('Используются резервные данные', 'warning');
    } catch (error) {
      console.error('❌ Fallback data load failed:', error);
      showNotification('Не удалось загрузить данные о продуктах', 'error');
      throw new Error('Unable to load any product data');
    }
  }

  /**
   * Обработка данных продуктов
   */
  async processProductsData(productsData) {
    console.log('🔧 Processing products data...');
    this.products.clear();

    if (!Array.isArray(productsData)) {
      throw new Error('Invalid data format: expected array');
    }

    let validProducts = 0;
    let invalidProducts = 0;

    for (const product of productsData) {
      try {
        const normalizedProduct = this.normalizeProduct(product);
        
        // Проверяем обязательные поля
        if (!normalizedProduct.code || !normalizedProduct.name) {
          console.warn('⚠️ Skipping product with missing required fields:', product);
          invalidProducts++;
          continue;
        }
        
        this.products.set(normalizedProduct.code, normalizedProduct);
        validProducts++;
        
      } catch (error) {
        console.warn('⚠️ Skipping invalid product:', product, error);
        invalidProducts++;
      }
    }

    console.log(`✅ Processed ${validProducts} valid products, ${invalidProducts} invalid`);
    
    if (validProducts === 0) {
      throw new Error('No valid products found in data');
    }
  }

  /**
   * Нормализация данных продукта
   */
  normalizeProduct(product) {
    // Безопасное извлечение данных с проверками
    const code = product['Код продукции']?.toString().trim() || '';
    const name = product['Полное наименование (русское)']?.toString().trim() || '';
    const shelfLife = parseInt(product['Срок годности']) || 0;
    const quantityPerPack = parseInt(product['Штук в упаковке']) || 0;
    const barcode = product['Штрихкод упаковки']?.toString().trim() || '';
    const manufacturer = product['Производитель']?.toString().trim() || '';
    const standard = product['Название стандарта']?.toString().trim() || '';

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

    return results.sort((a, b) => {
      const aCodeMatch = a.code.toLowerCase().startsWith(searchTerm);
      const bCodeMatch = b.code.toLowerCase().startsWith(searchTerm);
      
      if (aCodeMatch && !bCodeMatch) return -1;
      if (!aCodeMatch && bCodeMatch) return 1;
      
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
    try {
      showNotification('Обновление данных...', 'info');
      localStorage.removeItem(CONFIG.CACHE_KEYS.PRODUCTS);
      await this.loadFromNetwork();
      console.log('✅ Products force refreshed');
      return true;
    } catch (error) {
      console.error('❌ Force refresh failed:', error);
      showNotification('Ошибка при обновлении данных', 'error');
      throw error;
    }
  }

  /**
   * Синхронизация данных
   */
  async synchronize() {
    if (!navigator.onLine) {
      console.log('📴 Offline - skipping synchronization');
      return false;
    }

    try {
      await this.loadFromNetwork();
      console.log('✅ Products synchronized');
      return true;
    } catch (error) {
      console.error('❌ Synchronization failed:', error);
      return false;
    }
  }

  /**
   * Очистка кэша
   */
  clearCache() {
    localStorage.removeItem(CONFIG.CACHE_KEYS.PRODUCTS);
    this.products.clear();
    console.log('🗑️ Product cache cleared');
  }

  /**
   * Получение статистики
   */
  getStats() {
    return {
      total: this.products.size,
      cacheTimestamp: localStorage.getItem(CONFIG.CACHE_KEYS.PRODUCTS) 
        ? JSON.parse(localStorage.getItem(CONFIG.CACHE_KEYS.PRODUCTS)).timestamp 
        : null
    };
  }
}