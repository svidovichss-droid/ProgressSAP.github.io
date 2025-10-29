const CACHE_NAME = 'progress-calculator-v3.1';
const STATIC_CACHE = 'progress-static-v3.1';

/**
 * Service Worker для PWA приложения
 */
class CalculatorServiceWorker {
  constructor() {
    this.version = '3.1.0';
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
    
    // Предварительное кэширование критических ресурсов
    event.waitUntil(
      caches.open(STATIC_CACHE).then((cache) => {
        return cache.addAll([
          './',
          './index.html',
          './manifest.json',
          './src/styles/styles.css'
        ]);
      })
    );
    
    event.waitUntil(self.skipWaiting());
  }

  async handleActivate(event) {
    console.log('🎯 Service Worker: Активация');
    
    // Очистка старых кэшей
    event.waitUntil(
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
              console.log('🗑️ Удаление старого кэша:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
    );
    
    event.waitUntil(self.clients.claim());
  }

  async handleFetch(event) {
    const { request } = event;
    const url = new URL(request.url);

    // Пропускаем не-GET запросы
    if (request.method !== 'GET') {
      return;
    }

    // Для data.json используем стратегию "Сначала сеть, потом кэш"
    if (url.pathname.endsWith('data.json')) {
      event.respondWith(this.handleDataRequest(request));
      return;
    }

    // Для остальных файлов - "Сначала кэш, потом сеть"
    event.respondWith(this.handleStaticRequest(request));
  }

  async handleDataRequest(request) {
    const cache = await caches.open(CACHE_NAME);
    
    try {
      // Пробуем сеть first с CORS
      const networkResponse = await fetch(request, {
        mode: 'cors',
        cache: 'no-cache'
      });
      
      if (networkResponse.ok) {
        console.log('✅ Service Worker: Данные из сети');
        
        // Кэшируем свежий ответ
        await cache.put(request, networkResponse.clone());
        return networkResponse;
      }
      throw new Error('Network response not ok');
    } catch (error) {
      console.log('❌ Service Worker: Ошибка сети, пробуем кэш');
      
      // Пробуем кэш
      const cachedResponse = await cache.match(request);
      
      if (cachedResponse) {
        console.log('💾 Service Worker: Данные из кэша');
        return cachedResponse;
      }
      
      // Fallback
      console.log('🆘 Service Worker: Используем fallback данные');
      return new Response(JSON.stringify(this.getFallbackData()), {
        headers: { 
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      });
    }
  }

  async handleStaticRequest(request) {
    const cache = await caches.open(STATIC_CACHE);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        await cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      // Fallback для главной страницы
      if (request.url.includes('/ProgressSAP.github.io/') || request.url === self.location.origin + '/') {
        return caches.match('./index.html');
      }
      return new Response('Not found', { status: 404 });
    }
  }

  getFallbackData() {
    return [
      {
        "Код продукции": "000001",
        "Полное наименование (русское)": "Молоко пастеризованное 3,2% (fallback)",
        "Срок годности": 5,
        "Штук в упаковке": 20,
        "Штрихкод упаковки": "4601234567890",
        "Производитель": "Молочный комбинат №1",
        "Название стандарта": "ГОСТ 31450-2020"
      },
      {
        "Код продукции": "000002",
        "Полное наименование (русское)": "Йогурт натуральный 2,5% (fallback)",
        "Срок годности": 14,
        "Штук в упаковке": 12,
        "Штрихкод упаковки": "4601234567891",
        "Производитель": "Молочный комбинат №1",
        "Название стандарта": "ТУ 10.51.10-001-123456-2021"
      },
      {
        "Код продукции": "000003",
        "Полное наименование (русское)": "Сыр Российский 50% (fallback)",
        "Срок годности": 30,
        "Штук в упаковке": 8,
        "Штрихкод упаковки": "4601234567892",
        "Производитель": "Сыродельный завод 'Волга'",
        "Название стандарта": "ГОСТ 32260-2013"
      }
    ];
  }
}

// Инициализация только если поддерживается
if ('serviceWorker' in navigator) {
  new CalculatorServiceWorker();
}
