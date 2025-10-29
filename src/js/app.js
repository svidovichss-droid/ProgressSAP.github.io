  /**
   * Загрузка данных о продуктах
   */
  async loadProductsData() {
    console.group('🚀 Загрузка данных приложения');
    
    try {
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
      
      // Показываем диагностику
      const diagnostics = this.services.productService.getDiagnostics();
      console.log('📊 Диагностика:', diagnostics);
      
      console.log('🎉 Данные приложения успешно загружены');
      console.groupEnd();
      
    } catch (error) {
      console.error('💥 Критическая ошибка загрузки продуктов:', error);
      
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
      console.groupEnd();
    }
  }
