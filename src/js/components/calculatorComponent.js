/**
 * Компонент калькулятора срока годности
 */
export class CalculatorComponent {
  constructor(options = {}) {
    this.options = {
      dateFormat: 'dd.MM.yyyy',
      ...options
    };
    
    this.elements = {};
    this.state = {
      selectedProduct: null,
      productionDate: new Date(),
      calculatedDate: null,
      isValid: false
    };
    
    this.init();
  }

  /**
   * Инициализация компонента
   */
  init() {
    this.createDOM();
    this.bindEvents();
    this.setDefaultDate();
    console.log('✅ CalculatorComponent initialized');
  }

  /**
   * Создание DOM структуры
   */
  createDOM() {
    this.elements.container = document.createElement('div');
    this.elements.container.className = 'calculator-fields';
    
    const existingForm = document.querySelector('.product-fields-grid');
    if (existingForm && existingForm.parentNode) {
      existingForm.parentNode.replaceChild(this.elements.container, existingForm);
    }
    
    this.elements.container.innerHTML = this.getTemplate();
    this.bindElementReferences();
  }

  /**
   * Шаблон компонента
   */
  getTemplate() {
    return `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        <div class="form-group">
          <label for="productCode" class="form-label dark:text-gray-300">
            <i class="fas fa-barcode mr-2 text-blue-500"></i>
            Код продукции
          </label>
          <input
            type="text"
            id="productCode"
            readonly
            class="form-input readonly dark:bg-gray-600 dark:text-gray-200"
            aria-readonly="true"
          >
        </div>

        <div class="form-group">
          <label for="productName" class="form-label dark:text-gray-300">
            <i class="fas fa-tag mr-2 text-blue-500"></i>
            Наименование
          </label>
          <input
            type="text"
            id="productName"
            readonly
            class="form-input readonly dark:bg-gray-600 dark:text-gray-200"
            aria-readonly="true"
          >
        </div>

        <div class="form-group">
          <label for="shelfLife" class="form-label dark:text-gray-300">
            <i class="fas fa-calendar-day mr-2 text-blue-500"></i>
            Срок годности
          </label>
          <div class="relative">
            <input
              type="text"
              id="shelfLife"
              readonly
              class="form-input readonly pr-12 dark:bg-gray-600 dark:text-gray-200"
              aria-readonly="true"
            >
            <span class="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 text-sm dark:text-gray-400">дней</span>
          </div>
        </div>

        <div class="form-group">
          <label for="quantityPerPack" class="form-label dark:text-gray-300">
            <i class="fas fa-boxes mr-2 text-blue-500"></i>
            Штук в упаковке
          </label>
          <input
            type="number"
            id="quantityPerPack"
            min="1"
            readonly
            class="form-input readonly dark:bg-gray-600 dark:text-gray-200"
            aria-readonly="true"
          >
        </div>

        <div class="form-group">
          <label for="groupBarcode" class="form-label dark:text-gray-300">
            <i class="fas fa-qrcode mr-2 text-blue-500"></i>
            Штрихкод упаковки
          </label>
          <input
            type="text"
            id="groupBarcode"
            readonly
            class="form-input readonly dark:bg-gray-600 dark:text-gray-200"
            aria-readonly="true"
          >
        </div>

        <div class="form-group">
          <label for="manufacturerBarcode" class="form-label dark:text-gray-300">
            <i class="fas fa-industry mr-2 text-blue-500"></i>
            Производитель
          </label>
          <input
            type="text"
            id="manufacturerBarcode"
            readonly
            class="form-input readonly dark:bg-gray-600 dark:text-gray-200"
            aria-readonly="true"
          >
        </div>
      </div>

      <div class="production-date mb-6">
        <div class="form-group max-w-md">
          <label for="productionDate" class="form-label dark:text-gray-300">
            <i class="fas fa-calendar-alt mr-2 text-blue-500"></i>
            Дата производства
          </label>
          <input
            type="date"
            id="productionDate"
            class="form-input dark:bg-gray-600 dark:text-gray-200 dark:border-gray-500"
            aria-label="Укажите дату производства продукции"
            aria-required="true"
          >
          <div class="date-helpers mt-2 flex gap-2">
            <button type="button" class="date-helper-btn text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200 dark:border-gray-500" data-days="-1">Вчера</button>
            <button type="button" class="date-helper-btn text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200 dark:border-gray-500" data-days="0">Сегодня</button>
            <button type="button" class="date-helper-btn text-xs px-3 py-1 bg-gray-100 hover:bg-gray-200 rounded border border-gray-300 dark:bg-gray-600 dark:hover:bg-gray-500 dark:text-gray-200 dark:border-gray-500" data-days="1">Завтра</button>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Привязка ссылок на элементы
   */
  bindElementReferences() {
    this.elements.productCode = this.elements.container.querySelector('#productCode');
    this.elements.productName = this.elements.container.querySelector('#productName');
    this.elements.shelfLife = this.elements.container.querySelector('#shelfLife');
    this.elements.quantityPerPack = this.elements.container.querySelector('#quantityPerPack');
    this.elements.groupBarcode = this.elements.container.querySelector('#groupBarcode');
    this.elements.manufacturerBarcode = this.elements.container.querySelector('#manufacturerBarcode');
    this.elements.productionDate = document.getElementById('productionDate');
    this.elements.dateHelpers = this.elements.container.querySelector('.date-helpers');
    this.elements.calculateButton = document.getElementById('calculateButton');
    this.elements.resultBlock = document.getElementById('result');
    this.elements.expiryDate = document.getElementById('expiryDate');
    this.elements.resultMeta = document.getElementById('resultMeta');
    this.elements.resultActions = document.getElementById('resultActions');
  }

  /**
   * Привязка событий
   */
  bindEvents() {
    if (this.elements.calculateButton) {
      this.elements.calculateButton.addEventListener('click', this.handleCalculate.bind(this));
    }
    
    if (this.elements.productionDate) {
      this.elements.productionDate.addEventListener('change', this.validateForm.bind(this));
    }
    
    if (this.elements.dateHelpers) {
      this.elements.dateHelpers.addEventListener('click', this.handleDateHelper.bind(this));
    }
    
    if (this.elements.resultActions) {
      this.elements.resultActions.addEventListener('click', this.handleResultAction.bind(this));
    }
    
    document.addEventListener('keydown', this.handleGlobalKeydown.bind(this));
  }

  /**
   * Установка продукта
   */
  setProduct(product) {
    this.state.selectedProduct = product;
    this.updateProductFields(product);
    this.validateForm();
    
    if (product.standard && this.options.onStandardNotification) {
      this.options.onStandardNotification(product.standard);
    }
  }

  /**
   * Обновление полей продукта
   */
  updateProductFields(product) {
    const fields = {
      productCode: product.code,
      productName: product.name,
      shelfLife: product.shelfLife,
      quantityPerPack: product.quantityPerPack || '',
      groupBarcode: product.barcode || '',
      manufacturerBarcode: product.manufacturer || ''
    };
    
    Object.entries(fields).forEach(([key, value]) => {
      if (this.elements[key]) {
        this.elements[key].value = value;
      }
    });
  }

  /**
   * Валидация формы
   */
  validateForm() {
    this.state.isValid = false;
    
    if (!this.state.selectedProduct) {
      return false;
    }
    
    const dateValue = this.elements.productionDate.value;
    if (!dateValue) {
      return false;
    }
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) {
      return false;
    }
    
    if (date > new Date()) {
      return false;
    }
    
    if (this.state.selectedProduct.shelfLife <= 0) {
      return false;
    }
    
    this.state.isValid = true;
    
    if (this.elements.calculateButton) {
      this.elements.calculateButton.disabled = !this.state.isValid;
    }
    
    return this.state.isValid;
  }

  /**
   * Обработчик расчета
   */
  handleCalculate() {
    if (!this.validateForm()) {
      return;
    }
    
    try {
      const productionDate = new Date(this.elements.productionDate.value);
      const shelfLife = this.state.selectedProduct.shelfLife;
      
      const expiryDate = this.calculateExpiryDate(productionDate, shelfLife);
      this.showResult(expiryDate, productionDate, shelfLife);
      
    } catch (error) {
      console.error('❌ Calculation error:', error);
    }
  }

  /**
   * Расчет даты окончания срока годности
   */
  calculateExpiryDate(productionDate, shelfLifeDays) {
    const date = new Date(productionDate);
    date.setDate(date.getDate() + parseInt(shelfLifeDays));
    return date;
  }

  /**
   * Отображение результата
   */
  showResult(expiryDate, productionDate, shelfLife) {
    const formattedDate = this.formatDate(expiryDate);
    const daysUntilExpiry = Math.ceil((expiryDate - new Date()) / (1000 * 60 * 60 * 24));
    
    this.elements.expiryDate.textContent = formattedDate;
    this.state.calculatedDate = expiryDate;
    
    const metaInfo = `
      Срок годности: ${shelfLife} дней |
      Осталось: ${daysUntilExpiry} дней |
      Произведено: ${this.formatDate(productionDate)}
    `;
    
    this.elements.resultMeta.textContent = metaInfo;
    this.elements.resultMeta.classList.remove('hidden');
    this.elements.resultActions.classList.remove('hidden');
    this.elements.resultBlock.classList.remove('hidden');
    this.elements.resultBlock.classList.add('fade-in');
    
    setTimeout(() => {
      this.elements.resultBlock.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'nearest' 
      });
    }, 100);
  }

  /**
   * Форматирование даты
   */
  formatDate(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  /**
   * Обработчик помощников даты
   */
  handleDateHelper(event) {
    const button = event.target.closest('.date-helper-btn');
    if (!button) return;
    
    const days = parseInt(button.dataset.days);
    const newDate = new Date();
    newDate.setDate(newDate.getDate() + days);
    
    this.elements.productionDate.value = this.formatDateForInput(newDate);
    this.validateForm();
  }

  /**
   * Форматирование даты для input[type="date"]
   */
  formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * Обработчик действий с результатом
   */
  handleResultAction(event) {
    const button = event.target.closest('.action-btn');
    if (!button) return;
    
    const action = button.dataset.action;
    
    switch (action) {
      case 'copy':
        this.copyResult();
        break;
      case 'share':
        this.shareResult();
        break;
    }
  }

  /**
   * Копирование результата
   */
  async copyResult() {
    const text = `Дата окончания срока годности: ${this.elements.expiryDate.textContent}`;
    
    try {
      await navigator.clipboard.writeText(text);
      this.showTempMessage('Скопировано в буфер обмена', 'success');
    } catch (error) {
      console.error('❌ Copy failed:', error);
      this.showTempMessage('Ошибка копирования', 'error');
    }
  }

  /**
   * Поделиться результатом
   */
  async shareResult() {
    const shareData = {
      title: 'Калькулятор срока годности',
      text: `Дата окончания срока годности: ${this.elements.expiryDate.textContent}`,
      url: window.location.href
    };
    
    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await this.copyResult();
      }
    } catch (error) {
      if (error.name !== 'AbortError') {
        console.error('❌ Share failed:', error);
      }
    }
  }

  /**
   * Глобальные горячие клавиши
   */
  handleGlobalKeydown(event) {
    if (event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      this.handleCalculate();
    }
    
    if (event.key === 'Escape') {
      this.clearForm();
    }
  }

  /**
   * Установка даты по умолчанию
   */
  setDefaultDate() {
    if (this.elements.productionDate) {
      this.elements.productionDate.value = this.formatDateForInput(new Date());
    }
  }

  /**
   * Показать временное сообщение
   */
  showTempMessage(message, type = 'info') {
    // Используем существующую систему уведомлений
    if (window.showNotification) {
      window.showNotification(message, type);
    } else {
      console.log(`${type}: ${message}`);
    }
  }

  /**
   * Очистка формы
   */
  clearForm() {
    this.state.selectedProduct = null;
    this.state.calculatedDate = null;
    
    const fields = [
      'productCode', 'productName', 'shelfLife', 
      'quantityPerPack', 'groupBarcode', 'manufacturerBarcode'
    ];
    
    fields.forEach(field => {
      if (this.elements[field]) {
        this.elements[field].value = '';
      }
    });
    
    this.setDefaultDate();
    
    if (this.elements.resultBlock) {
      this.elements.resultBlock.classList.add('hidden');
    }
    
    this.state.isValid = false;
    if (this.elements.calculateButton) {
      this.elements.calculateButton.disabled = true;
    }
  }

  /**
   * Получить DOM элемент
   */
  getElement() {
    return this.elements.container;
  }

  /**
   * Получить состояние
   */
  getState() {
    return { ...this.state };
  }
}