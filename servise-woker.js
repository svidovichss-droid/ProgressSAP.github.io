const CACHE_NAME = 'progress-calculator-v3.0';

/**
 * Service Worker для PWA приложения
 */
class CalculatorServiceWorker {
  constructor() {
    this.version = '3.0.0';
    this.init();
  }

  async init() {
    self.addEventListener('install', this.handleInstall.bind(this));
    self.addEventListener('activate', this.handleActivate.bind(this));
    self.addEventListener('fetch', this.handleFetch.bind(this));
    
    console.log('🛠️ Service Worker initialized');
  }

  async handleInstall(event) {
    console.log('🔧 Service Worker: Установка');
    event.waitUntil(self.skipWaiting());
  }

  async handleActivate(event) {
    console.log('🎯 Service Worker: Активация');
    event.waitUntil(self.clients.claim());
  }

  async handleFetch(event) {
    const { request } = event;
    const url = new URL(request.url);

    console.log('🌐 Service Worker fetch:', url.pathname);

    // Для data.json используем стратегию "Сначала сеть, потом кэш"
    if (url.pathname.includes('data.json')) {
      event.respondWith(this.handleDataRequest(request));
      return;
    }

    // Для остальных файлов - "Сначала кэш, потом сеть"
    event.respondWith(this.handleStaticRequest(request));
  }

  async handleDataRequest(request) {
    try {
      // Пробуем сеть first
      const networkResponse = await fetch(request);
      
      if (networkResponse.ok) {
        console.log('✅ Service Worker: Данные из сети');
        return networkResponse;
      }
      throw new Error('Network response not ok');
    } catch (error) {
      console.log('❌ Service Worker: Ошибка сети, пробуем кэш');
      
      // Пробуем кэш
      const cache = await caches.open(CACHE_NAME);
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('💾 Service Worker: Данные из кэша');
        return cachedResponse;
      }
      
      // Fallback
      console.log('🆘 Service Worker: Используем fallback данные');
      return new Response(JSON.stringify(this.getFallbackData()), {
        headers: { 'Content-Type': 'application/json' }
      });
    }
  }

  async handleStaticRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('💾 Service Worker: Статика из кэша');
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      return new Response('Not found', { status: 404 });
    }
  }

  getFallbackData() {
    return [
      {
        "Код продукции": "000001",
        "Полное наименование (русское)": "Тестовый продукт 1 (fallback)",
        "Срок годности": 365,
        "Штук в упаковке": 10,
        "Штрихкод упаковки": "1234567890123",
        "Производитель": "Тестовый производитель",
        "Название стандарта": "ГОСТ 12345-2020"
      }
    ];
  }
}

new CalculatorServiceWorker();