import { productService } from '../services/productService.js';
import { debounce, highlightText } from '../utils/helpers.js';

/**
 * Компонент поиска продуктов
 */
export class SearchComponent {
  constructor(options = {}) {
    this.options = {
      minQueryLength: 2,
      maxResults: 10,
      debounceDelay: 300,
      ...options
    };
    
    this.elements = {};
    this.state = {
      query: '',
      results: [],
      isOpen: false,
      selectedIndex: -1
    };
    
    this.init();
  }

  /**
   * Инициализация компонента
   */
  init() {
    this.createDOM();
    this.bindEvents();
    console.log('✅ SearchComponent initialized');
  }

  /**
   * Создание DOM структуры
   */
  createDOM() {
    this.elements.container = document.createElement('div');
    this.elements.container.className = 'search-component';
    
    const existingInput = document.getElementById('productSearch');
    if (existingInput && existingInput.parentNode) {
      existingInput.parentNode.replaceChild(this.elements.container, existingInput);
    }
    
    this.elements.input = document.createElement('input');
    this.elements.input.type = 'text';
    this.elements.input.placeholder = 'Введите код или название продукта...';
    this.elements.input.className = 'search-input w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white';
    this.elements.input.setAttribute('aria-label', 'Поиск продукта');
    
    this.elements.results = document.createElement('div');
    this.elements.results.className = 'search-results absolute z-50 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg shadow-xl max-h-80 overflow-y-auto hidden';
    this.elements.results.setAttribute('role', 'listbox');
    
    this.elements.container.appendChild(this.elements.input);
    this.elements.container.appendChild(this.elements.results);
  }

  /**
   * Привязка событий
   */
  bindEvents() {
    const debouncedSearch = debounce(
      this.handleSearch.bind(this), 
      this.options.debounceDelay
    );
    
    this.elements.input.addEventListener('input', debouncedSearch);
    this.elements.input.addEventListener('focus', this.handleFocus.bind(this));
    this.elements.input.addEventListener('blur', this.handleBlur.bind(this));
    this.elements.input.addEventListener('keydown', this.handleKeydown.bind(this));
    
    document.addEventListener('click', this.handleDocumentClick.bind(this));
  }

  /**
   * Обработчик поиска
   */
  async handleSearch(event) {
    const query = event.target.value.trim();
    this.state.query = query;
    
    if (query.length < this.options.minQueryLength) {
      this.clearResults();
      return;
    }
    
    try {
      this.showLoading();
      const results = await productService.searchProducts(query);
      this.displayResults(results.slice(0, this.options.maxResults));
    } catch (error) {
      console.error('❌ Search error:', error);
      this.showError('Ошибка поиска');
    }
  }

  /**
   * Отображение результатов
   */
  displayResults(results) {
    this.state.results = results;
    this.state.selectedIndex = -1;
    
    if (results.length === 0) {
      this.showNoResults();
      return;
    }
    
    this.elements.results.innerHTML = '';
    this.elements.results.classList.remove('hidden');
    
    results.forEach((product, index) => {
      const resultElement = this.createResultElement(product, index);
      this.elements.results.appendChild(resultElement);
    });
    
    this.state.isOpen = true;
  }

  /**
   * Создание элемента результата
   */
  createResultElement(product, index) {
    const element = document.createElement('div');
    element.className = 'search-result-item p-3 hover:bg-blue-50 cursor-pointer flex items-center border-b border-gray-100 dark:border-gray-600 dark:hover:bg-blue-900 last:border-0';
    element.setAttribute('role', 'option');
    element.setAttribute('data-index', index);
    element.setAttribute('data-code', product.code);
    
    const highlightedName = highlightText(product.name, this.state.query);
    const highlightedCode = highlightText(product.code, this.state.query);
    
    element.innerHTML = `
      <div class="bg-blue-100 p-2 rounded-lg mr-3 dark:bg-blue-800">
        <i class="fas fa-box text-blue-600 dark:text-blue-300"></i>
      </div>
      <div>
        <div class="font-medium text-blue-800 dark:text-blue-200">${highlightedName}</div>
        <div class="text-sm text-gray-500 dark:text-gray-400">Код: <span class="product-code">${highlightedCode}</span> | Срок: <span class="shelf-life">${product.shelfLife} дней</span></div>
      </div>
    `;
    
    element.addEventListener('click', () => {
      this.selectProduct(product);
    });
    
    element.addEventListener('mouseenter', () => {
      this.setSelectedIndex(index);
    });
    
    return element;
  }

  /**
   * Выбор продукта
   */
  selectProduct(product) {
    this.elements.input.value = '';
    this.clearResults();
    
    if (this.options.onProductSelect) {
      this.options.onProductSelect(product);
    }
  }

  /**
   * Установка выбранного индекса
   */
  setSelectedIndex(index) {
    const previousSelected = this.elements.results.querySelector('.bg-blue-100');
    if (previousSelected) {
      previousSelected.classList.remove('bg-blue-100', 'dark:bg-blue-900');
    }
    
    this.state.selectedIndex = index;
    
    if (index >= 0 && index < this.state.results.length) {
      const newSelected = this.elements.results.querySelector(`[data-index="${index}"]`);
      if (newSelected) {
        newSelected.classList.add('bg-blue-100', 'dark:bg-blue-900');
      }
    }
  }

  /**
   * Обработчик клавиатуры
   */
  handleKeydown(event) {
    if (!this.state.isOpen) return;
    
    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.navigateResults(1);
        break;
        
      case 'ArrowUp':
        event.preventDefault();
        this.navigateResults(-1);
        break;
        
      case 'Enter':
        event.preventDefault();
        this.selectCurrentResult();
        break;
        
      case 'Escape':
        event.preventDefault();
        this.clearResults();
        break;
    }
  }

  /**
   * Навигация по результатам
   */
  navigateResults(direction) {
    let newIndex = this.state.selectedIndex + direction;
    
    if (newIndex < 0) {
      newIndex = this.state.results.length - 1;
    } else if (newIndex >= this.state.results.length) {
      newIndex = 0;
    }
    
    this.setSelectedIndex(newIndex);
  }

  /**
   * Выбор текущего результата
   */
  selectCurrentResult() {
    if (this.state.selectedIndex >= 0 && this.state.selectedIndex < this.state.results.length) {
      const product = this.state.results[this.state.selectedIndex];
      this.selectProduct(product);
    }
  }

  /**
   * Обработчик фокуса
   */
  handleFocus() {
    if (this.state.results.length > 0) {
      this.elements.results.classList.remove('hidden');
      this.state.isOpen = true;
    }
  }

  /**
   * Обработчик потери фокуса
   */
  handleBlur() {
    setTimeout(() => {
      this.state.isOpen = false;
    }, 150);
  }

  /**
   * Обработчик клика по документу
   */
  handleDocumentClick(event) {
    if (!this.elements.container.contains(event.target)) {
      this.clearResults();
    }
  }

  /**
   * Показать состояние загрузки
   */
  showLoading() {
    this.elements.results.innerHTML = `
      <div class="p-3 text-center text-gray-500 dark:text-gray-400">
        <div class="loading-spinner inline-block mr-2"></div>
        Поиск...
      </div>
    `;
    this.elements.results.classList.remove('hidden');
  }

  /**
   * Показать отсутствие результатов
   */
  showNoResults() {
    this.elements.results.innerHTML = `
      <div class="p-3 text-gray-500 text-center dark:text-gray-400">
        Ничего не найдено
      </div>
    `;
    this.elements.results.classList.remove('hidden');
    this.state.isOpen = true;
  }

  /**
   * Показать ошибку
   */
  showError(message) {
    this.elements.results.innerHTML = `
      <div class="p-3 text-red-500 text-center dark:text-red-400">
        <i class="fas fa-exclamation-triangle mr-2"></i>
        ${message}
      </div>
    `;
    this.elements.results.classList.remove('hidden');
    this.state.isOpen = true;
  }

  /**
   * Очистить результаты
   */
  clearResults() {
    this.state.results = [];
    this.state.selectedIndex = -1;
    this.state.isOpen = false;
    this.elements.results.classList.add('hidden');
    this.elements.results.innerHTML = '';
  }

  /**
   * Получить DOM элемент
   */
  getElement() {
    return this.elements.container;
  }

  /**
   * Фокус на поле поиска
   */
  focus() {
    this.elements.input.focus();
  }

  /**
   * Очистить поле поиска
   */
  clear() {
    this.elements.input.value = '';
    this.clearResults();
  }
}