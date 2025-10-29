  /**
   * Загрузка данных о продуктах
   */
  async loadProductsData() {
    console.log('🚀 Starting application data loading...');
    
    try {
      const products = await this.services.productService.loadProducts();
      this.state.products = products;
      this.state.lastUpdate = new Date();
      
      this.updateProductsCount();
      this.updateLastUpdateInfo();
      
      console.log('🎉 Application data loaded successfully');
      
    } catch (error) {
      console.error('💥 Critical error loading products:', error);
      
      // Показываем детальную ошибку пользователю
      let errorMessage = 'Не удалось загрузить данные о продуктах';
      
      if (error.message.includes('timeout')) {
        errorMessage = 'Таймаут при загрузке данных. Проверьте подключение к интернету.';
      } else if (error.message.includes('HTTP')) {
        errorMessage = 'Ошибка сервера при загрузке данных.';
      } else if (error.message.includes('Invalid data format')) {
        errorMessage = 'Некорректный формат данных. Проверьте файл data.json.';
      }
      
      showNotification(errorMessage, 'error');
      
      // Все равно обновляем UI с тем, что есть
      this.updateProductsCount();
      this.updateLastUpdateInfo();
    }
  }