class CurrencyConverter {
  constructor() {
    this.exchangeRate = 0;
    this.lastUpdated = null;
    this.conversionsToday = parseInt(localStorage.getItem('conversionsToday') || '0');
    this.lastConversionDate = localStorage.getItem('lastConversionDate');
    this.baseURL = 'https://api.exchangerate-api.com/v4/latest/USD';
    
    this.initializeElements();
    this.bindEvents();
    this.fetchExchangeRate();
    this.updateStats();
    this.resetDailyCounterIfNeeded();
  }

  initializeElements() {
    this.inrInput = document.getElementById('inr-input');
    this.usdtOutput = document.getElementById('usdt-output');
    this.rateInfo = document.getElementById('rate-info');
    this.rateText = document.getElementById('rate-text');
    this.loadingSpinner = document.getElementById('loading-spinner');
    this.errorMessage = document.getElementById('error-message');
    this.clearBtn = document.getElementById('clear-btn');
    this.copyBtn = document.getElementById('copy-btn');
    this.refreshBtn = document.getElementById('refresh-btn');
    this.quickButtons = document.querySelectorAll('.quick-btn');
    this.totalConversions = document.getElementById('total-conversions');
    this.lastUpdateStat = document.getElementById('last-update');
    this.apiStatus = document.getElementById('api-status');
  }

  bindEvents() {
    // Input events
    this.inrInput.addEventListener('input', (e) => {
      this.convertCurrency(e.target.value);
      this.updateConversionCounter();
    });

    this.inrInput.addEventListener('keydown', (e) => {
      this.handleKeyInput(e);
    });

    // Button events
    this.clearBtn.addEventListener('click', () => {
      this.clearInput();
    });

    this.copyBtn.addEventListener('click', () => {
      this.copyResult();
    });

    this.refreshBtn.addEventListener('click', () => {
      this.fetchExchangeRate();
    });

    // Quick amount buttons
    this.quickButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        const amount = e.target.dataset.amount;
        this.inrInput.value = amount;
        this.convertCurrency(amount);
        this.updateConversionCounter();
        this.inrInput.focus();
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      this.handleKeyboardShortcuts(e);
    });

    // Auto-refresh every 5 minutes
    setInterval(() => {
      this.fetchExchangeRate();
    }, 300000);

    // Focus management
    this.inrInput.addEventListener('focus', () => {
      this.inrInput.select();
    });
  }

  handleKeyInput(e) {
    // Allow: backspace, delete, tab, escape, enter, decimal point
    if ([46, 8, 9, 27, 13, 190, 110].indexOf(e.keyCode) !== -1 ||
        // Allow: Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X
        (e.keyCode === 65 && e.ctrlKey === true) ||
        (e.keyCode === 67 && e.ctrlKey === true) ||
        (e.keyCode === 86 && e.ctrlKey === true) ||
        (e.keyCode === 88 && e.ctrlKey === true) ||
        // Allow: home, end, left, right
        (e.keyCode >= 35 && e.keyCode <= 39)) {
      return;
    }
    // Ensure that it is a number and stop the keypress
    if ((e.shiftKey || (e.keyCode < 48 || e.keyCode > 57)) && (e.keyCode < 96 || e.keyCode > 105)) {
      e.preventDefault();
    }
  }

  handleKeyboardShortcuts(e) {
    // Ctrl/Cmd + R to refresh rates
    if ((e.ctrlKey || e.metaKey) && e.key === 'r') {
      e.preventDefault();
      this.fetchExchangeRate();
    }
    
    // ESC to clear input
    if (e.key === 'Escape') {
      this.clearInput();
    }

    // Ctrl/Cmd + C to copy result when input is focused
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && document.activeElement === this.inrInput) {
      if (this.usdtOutput.textContent !== '0.00') {
        e.preventDefault();
        this.copyResult();
      }
    }
  }

  async fetchExchangeRate() {
    try {
      this.showLoading(true);
      this.hideError();
      this.updateApiStatus('loading');

      const response = await fetch(this.baseURL);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      
      if (data.rates && data.rates.INR) {
        const usdToInr = data.rates.INR;
        this.exchangeRate = 1 / usdToInr;
        this.lastUpdated = new Date();
        
        this.updateRateDisplay();
        this.convertCurrency(this.inrInput.value);
        this.updateApiStatus('online');
        this.updateStats();
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error fetching exchange rate:', error);
      this.showError('Failed to fetch exchange rate. Using fallback rate.');
      this.updateApiStatus('offline');
      
      // Fallback rate
      if (this.exchangeRate === 0) {
        this.exchangeRate = 0.012;
        this.updateRateDisplay(true);
      }
    } finally {
      this.showLoading(false);
    }
  }

  convertCurrency(inrAmount) {
    if (!inrAmount || isNaN(inrAmount) || inrAmount < 0) {
      this.usdtOutput.textContent = '0.00';
      return;
    }

    if (this.exchangeRate === 0) {
      this.usdtOutput.textContent = 'Loading...';
      return;
    }

    const usdAmount = parseFloat(inrAmount) * this.exchangeRate;
    const usdtAmount = usdAmount; // USDT is pegged to USD
    
    this.usdtOutput.textContent = this.formatCurrency(usdtAmount);
    
    // Add animation effect
    this.usdtOutput.style.transform = 'scale(1.05)';
    setTimeout(() => {
      this.usdtOutput.style.transform = 'scale(1)';
    }, 200);
  }

  formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6
    }).format(amount);
  }

  updateRateDisplay(isFallback = false) {
    const rateText = `1 INR = ₮${this.formatCurrency(this.exchangeRate)} USDT`;
    const timeText = this.lastUpdated ? 
      ` • Updated ${this.formatTime(this.lastUpdated)}` : 
      ' • Using fallback rate';
    
    this.rateText.textContent = rateText + (isFallback ? ' (Approximate)' : timeText);
    
    if (!isFallback) {
      this.rateInfo.classList.add('success');
    }
  }

  formatTime(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'just now';
    if (diffMins === 1) return '1 minute ago';
    if (diffMins < 60) return `${diffMins} minutes ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours === 1) return '1 hour ago';
    if (diffHours < 24) return `${diffHours} hours ago`;
    
    return date.toLocaleDateString();
  }

  clearInput() {
    this.inrInput.value = '';
    this.usdtOutput.textContent = '0.00';
    this.inrInput.focus();
  }

  copyResult() {
    const result = this.usdtOutput.textContent;
    if (result && result !== '0.00') {
      navigator.clipboard.writeText(result).then(() => {
        this.showToast('Result copied to clipboard!');
      }).catch(() => {
        // Fallback for older browsers
        const textArea = document.createElement('textarea');
        textArea.value = result;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        this.showToast('Result copied to clipboard!');
      });
    }
  }

  showToast(message) {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success-color);
      color: white;
      padding: 12px 20px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 1000;
      animation: slideInRight 0.3s ease-out;
    `;
    
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-in';
      setTimeout(() => {
        document.body.removeChild(toast);
      }, 300);
    }, 2000);
  }

  updateConversionCounter() {
    if (this.inrInput.value && !isNaN(this.inrInput.value) && this.inrInput.value > 0) {
      this.conversionsToday++;
      localStorage.setItem('conversionsToday', this.conversionsToday.toString());
      localStorage.setItem('lastConversionDate', new Date().toDateString());
      this.updateStats();
    }
  }

  resetDailyCounterIfNeeded() {
    const today = new Date().toDateString();
    if (this.lastConversionDate !== today) {
      this.conversionsToday = 0;
      localStorage.setItem('conversionsToday', '0');
    }
  }

  updateStats() {
    this.totalConversions.textContent = this.conversionsToday.toLocaleString();
    
    if (this.lastUpdated) {
      this.lastUpdateStat.textContent = this.lastUpdated.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  updateApiStatus(status) {
    const statusElement = this.apiStatus;
    statusElement.className = '';
    
    switch (status) {
      case 'online':
        statusElement.style.color = 'var(--success-color)';
        statusElement.textContent = '●';
        break;
      case 'offline':
        statusElement.style.color = 'var(--error-color)';
        statusElement.textContent = '●';
        break;
      case 'loading':
        statusElement.style.color = 'var(--warning-color)';
        statusElement.textContent = '●';
        break;
    }
  }

  showLoading(show) {
    if (show) {
      this.loadingSpinner.classList.remove('hidden');
      this.refreshBtn.style.animation = 'spin 1s linear infinite';
    } else {
      this.loadingSpinner.classList.add('hidden');
      this.refreshBtn.style.animation = '';
    }
  }

  showError(message) {
    this.errorMessage.textContent = message;
    this.errorMessage.classList.add('show');
    setTimeout(() => {
      this.hideError();
    }, 5000);
  }

  hideError() {
    this.errorMessage.classList.remove('show');
  }
}

// Enhanced animations and effects
function addEnhancedAnimations() {
  // Add CSS for toast animations
  const style = document.createElement('style');
  style.textContent = `
    @keyframes slideInRight {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOutRight {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
    
    .currency-input {
      transition: all 0.3s ease;
    }
    
    .currency-output {
      transition: all 0.2s ease;
    }
  `;
  document.head.appendChild(style);

  // Add entrance animations
  const elements = document.querySelectorAll('.converter-card, .info-card, .stats-section');
  
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        setTimeout(() => {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
        }, index * 100);
      }
    });
  });

  elements.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
  });
}

// Network status handling
function handleNetworkStatus() {
  window.addEventListener('online', () => {
    if (window.converter) {
      window.converter.fetchExchangeRate();
      window.converter.showToast('Connection restored! Rates updated.');
    }
  });

  window.addEventListener('offline', () => {
    if (window.converter) {
      window.converter.showError('You are offline. Using last known exchange rate.');
      window.converter.updateApiStatus('offline');
    }
  });
}

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
  // Initialize converter
  window.converter = new CurrencyConverter();
  
  // Add enhanced features
  addEnhancedAnimations();
  handleNetworkStatus();
  
  // Focus on input for better UX
  setTimeout(() => {
    document.getElementById('inr-input').focus();
  }, 500);
  
  console.log('🚀 Enhanced INR to USDT Converter initialized!');
  console.log('💡 Features:');
  console.log('• Real-time exchange rates with auto-refresh');
  console.log('• Quick amount buttons for common conversions');
  console.log('• Copy results with one click');
  console.log('• Keyboard shortcuts (Ctrl+R to refresh, ESC to clear)');
  console.log('• Daily conversion counter');
  console.log('• Offline support with fallback rates');
});

// Export for potential testing
window.CurrencyConverter = CurrencyConverter;