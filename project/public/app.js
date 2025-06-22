// Firebase Configuration
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Application State
class AppState {
  constructor() {
    this.currentUser = null;
    this.exchangeRate = 86.58;
    this.userProfile = null;
    this.transactions = [];
    this.kycStatus = 'pending';
    
    this.init();
  }

  init() {
    this.bindEvents();
    this.initAuth();
    this.fetchExchangeRate();
    this.setupNavigation();
    this.updateConverter();
  }

  bindEvents() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = e.target.getAttribute('href').substring(1);
        this.showSection(target);
      });
    });

    // Auth buttons
    document.getElementById('loginBtn').addEventListener('click', () => {
      this.showAuthModal('login');
    });

    document.getElementById('signupBtn').addEventListener('click', () => {
      this.showAuthModal('signup');
    });

    document.getElementById('logoutBtn').addEventListener('click', () => {
      this.logout();
    });

    // Get Started button
    document.getElementById('getStartedBtn').addEventListener('click', () => {
      if (this.currentUser) {
        this.showSection('dashboard');
      } else {
        this.showAuthModal('signup');
      }
    });

    // Auth modal
    document.getElementById('authSwitchBtn').addEventListener('click', () => {
      this.toggleAuthMode();
    });

    document.getElementById('authForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleAuth();
    });

    // Modal close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.target.closest('.modal').classList.remove('active');
      });
    });

    // Converter
    document.getElementById('sendAmount').addEventListener('input', (e) => {
      this.updateConverter();
    });

    document.getElementById('transferBtn').addEventListener('click', () => {
      this.initiateTransfer();
    });

    // Profile form
    document.getElementById('updateProfileBtn').addEventListener('click', () => {
      this.updateProfile();
    });

    document.getElementById('enable2FABtn').addEventListener('click', () => {
      this.showToast('2FA feature coming soon!', 'warning');
    });

    document.getElementById('changePasswordBtn').addEventListener('click', () => {
      this.showToast('Password change feature coming soon!', 'warning');
    });

    // KYC form
    document.getElementById('kycUploadForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.submitKYC();
    });

    // Transfer form
    document.getElementById('transferForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this.initiateWalletTransfer();
    });

    // Copy wallet address
    document.getElementById('copyAddress').addEventListener('click', () => {
      this.copyWalletAddress();
    });

    // Refresh transactions
    document.getElementById('refreshTransactions').addEventListener('click', () => {
      this.loadTransactions();
    });
  }

  initAuth() {
    auth.onAuthStateChanged((user) => {
      this.currentUser = user;
      this.updateAuthUI();
      
      if (user) {
        this.loadUserProfile();
        this.loadTransactions();
        this.checkKYCStatus();
        this.updateProfilePage();
      }
    });
  }

  setupNavigation() {
    // Show home section by default
    this.showSection('home');
  }

  showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
      section.classList.remove('active');
    });

    // Show target section
    document.getElementById(sectionId).classList.add('active');

    // Update navigation
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('href') === `#${sectionId}`) {
        link.classList.add('active');
      }
    });

    // Require auth for protected sections
    if (['profile', 'dashboard', 'wallet'].includes(sectionId) && !this.currentUser) {
      this.showAuthModal('login');
      this.showSection('home');
      return;
    }
  }

  updateAuthUI() {
    const loginBtn = document.getElementById('loginBtn');
    const signupBtn = document.getElementById('signupBtn');
    const userMenu = document.getElementById('userMenu');
    const profileLink = document.getElementById('profileLink');
    const dashboardLink = document.getElementById('dashboardLink');
    const walletLink = document.getElementById('walletLink');

    if (this.currentUser) {
      loginBtn.classList.add('hidden');
      signupBtn.classList.add('hidden');
      userMenu.classList.remove('hidden');
      profileLink.classList.remove('hidden');
      dashboardLink.classList.remove('hidden');
      walletLink.classList.remove('hidden');
      
      document.getElementById('userName').textContent = 
        this.currentUser.displayName || this.currentUser.email.split('@')[0];
      document.getElementById('userAvatar').src = 
        this.currentUser.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.email)}&background=22C55E&color=fff`;
    } else {
      loginBtn.classList.remove('hidden');
      signupBtn.classList.remove('hidden');
      userMenu.classList.add('hidden');
      profileLink.classList.add('hidden');
      dashboardLink.classList.add('hidden');
      walletLink.classList.add('hidden');
    }
  }

  updateProfilePage() {
    if (!this.currentUser) return;

    const profileName = document.getElementById('profileName');
    const profileEmail = document.getElementById('profileEmail');
    const profileAvatarImg = document.getElementById('profileAvatarImg');
    const editName = document.getElementById('editName');
    const editEmail = document.getElementById('editEmail');
    const profileJoined = document.getElementById('profileJoined');

    profileName.textContent = this.currentUser.displayName || 'User Name';
    profileEmail.textContent = this.currentUser.email;
    profileAvatarImg.src = this.currentUser.photoURL || 
      `https://ui-avatars.com/api/?name=${encodeURIComponent(this.currentUser.email)}&background=22C55E&color=fff&size=80`;
    
    editName.value = this.currentUser.displayName || '';
    editEmail.value = this.currentUser.email;
    
    if (this.currentUser.metadata.creationTime) {
      const joinDate = new Date(this.currentUser.metadata.creationTime);
      profileJoined.textContent = joinDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short' 
      });
    }

    if (this.userProfile) {
      document.getElementById('profileBalance').textContent = this.userProfile.balance.toFixed(2);
      document.getElementById('profileTransactions').textContent = this.transactions.length;
      
      const statusElement = document.getElementById('profileStatus');
      statusElement.textContent = this.userProfile.kycStatus === 'verified' ? 'Verified' : 'Pending';
      statusElement.className = `profile-status ${this.userProfile.kycStatus}`;
    }
  }

  showAuthModal(mode) {
    const modal = document.getElementById('authModal');
    const title = document.getElementById('authModalTitle');
    const submitText = document.getElementById('authSubmitText');
    const switchText = document.getElementById('authSwitchText');
    const switchBtn = document.getElementById('authSwitchBtn');
    const signupFields = document.getElementById('signupFields');

    if (mode === 'login') {
      title.textContent = 'Login';
      submitText.textContent = 'Login';
      switchText.textContent = "Don't have an account?";
      switchBtn.textContent = 'Sign up';
      signupFields.classList.add('hidden');
    } else {
      title.textContent = 'Sign Up';
      submitText.textContent = 'Sign Up';
      switchText.textContent = 'Already have an account?';
      switchBtn.textContent = 'Login';
      signupFields.classList.remove('hidden');
    }

    modal.dataset.mode = mode;
    modal.classList.add('active');
  }

  toggleAuthMode() {
    const modal = document.getElementById('authModal');
    const currentMode = modal.dataset.mode;
    const newMode = currentMode === 'login' ? 'signup' : 'login';
    
    modal.classList.remove('active');
    setTimeout(() => {
      this.showAuthModal(newMode);
    }, 100);
  }

  async handleAuth() {
    const modal = document.getElementById('authModal');
    const mode = modal.dataset.mode;
    const email = document.getElementById('authEmail').value;
    const password = document.getElementById('authPassword').value;
    const displayName = document.getElementById('authDisplayName').value;

    this.showLoading(true);

    try {
      let userCredential;
      
      if (mode === 'login') {
        userCredential = await auth.signInWithEmailAndPassword(email, password);
      } else {
        userCredential = await auth.createUserWithEmailAndPassword(email, password);
        
        // Update profile
        if (displayName) {
          await userCredential.user.updateProfile({
            displayName: displayName
          });
        }

        // Register user on backend
        await this.registerUser(userCredential.user);
      }

      modal.classList.remove('active');
      this.showToast('Authentication successful!', 'success');
      
      // Clear form
      document.getElementById('authForm').reset();
      
    } catch (error) {
      console.error('Auth error:', error);
      this.showToast(error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async registerUser(user) {
    try {
      const response = await fetch('/api/user/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName || ''
        })
      });

      const data = await response.json();
      if (data.success) {
        this.userProfile = data.user;
        this.updateDashboard();
      }
    } catch (error) {
      console.error('Registration error:', error);
    }
  }

  async logout() {
    try {
      await auth.signOut();
      this.userProfile = null;
      this.transactions = [];
      this.showSection('home');
      this.showToast('Logged out successfully!', 'success');
    } catch (error) {
      console.error('Logout error:', error);
      this.showToast('Logout failed', 'error');
    }
  }

  async fetchExchangeRate() {
    try {
      const response = await fetch('/api/exchange-rate');
      const data = await response.json();
      
      if (data.success) {
        this.exchangeRate = data.rate * 83.5; // Convert USD to INR rate
        this.updateRateDisplay();
        this.updateConverter();
      }
    } catch (error) {
      console.error('Rate fetch error:', error);
      this.exchangeRate = 86.58; // Fallback rate
      this.updateRateDisplay();
    }
  }

  updateRateDisplay() {
    document.getElementById('exchangeRate').textContent = this.exchangeRate.toFixed(2);
    document.getElementById('currentRate').textContent = `Google FX rate: $1.00 = ₹${this.exchangeRate.toFixed(2)}`;
  }

  updateConverter() {
    const sendAmount = parseFloat(document.getElementById('sendAmount').value) || 1000;
    const receiveAmount = sendAmount * this.exchangeRate;
    document.getElementById('receiveAmount').textContent = receiveAmount.toLocaleString('en-IN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  async updateProfile() {
    if (!this.currentUser) return;

    const displayName = document.getElementById('editName').value;
    const phone = document.getElementById('editPhone').value;

    this.showLoading(true);

    try {
      // Update Firebase profile
      await this.currentUser.updateProfile({
        displayName: displayName
      });

      // Update local state
      this.updateProfilePage();
      this.updateAuthUI();

      this.showToast('Profile updated successfully!', 'success');
    } catch (error) {
      console.error('Profile update error:', error);
      this.showToast('Failed to update profile', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async initiateTransfer() {
    if (!this.currentUser) {
      this.showAuthModal('login');
      return;
    }

    const sendAmount = parseFloat(document.getElementById('sendAmount').value) || 1000;
    const receiveAmount = sendAmount * this.exchangeRate;

    if (!sendAmount || sendAmount <= 0) {
      this.showToast('Please enter a valid amount', 'error');
      return;
    }

    if (this.userProfile && this.userProfile.kycStatus !== 'verified') {
      this.showToast('KYC verification required to proceed', 'warning');
      this.showSection('dashboard');
      return;
    }

    // Show payment modal
    this.showPaymentModal(receiveAmount, sendAmount);
  }

  showPaymentModal(inrAmount, usdAmount) {
    document.getElementById('paymentINR').textContent = `₹${inrAmount.toLocaleString()}`;
    document.getElementById('paymentUSDT').textContent = `${usdAmount.toFixed(2)} USD`;
    document.getElementById('paymentRate').textContent = 
      `1 USD = ₹${this.exchangeRate.toFixed(2)}`;

    const modal = document.getElementById('paymentModal');
    modal.classList.add('active');

    // Handle payment button
    document.getElementById('proceedPayment').onclick = () => {
      this.processPayment(inrAmount, usdAmount);
    };
  }

  async processPayment(inrAmount, usdAmount) {
    this.showLoading(true);

    try {
      // Create Razorpay order
      const orderResponse = await fetch('/api/payment/create-order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: inrAmount,
          uid: this.currentUser.uid
        })
      });

      const orderData = await orderResponse.json();
      
      if (!orderData.success) {
        throw new Error(orderData.error);
      }

      // Initialize Razorpay
      const options = {
        key: 'rzp_test_1234567890', // Replace with your Razorpay key
        amount: orderData.order.amount,
        currency: orderData.order.currency,
        name: 'Enkrypt Enterprise',
        description: 'INR to USDT Conversion',
        order_id: orderData.order.id,
        handler: async (response) => {
          await this.verifyPayment(response, inrAmount, usdAmount);
        },
        prefill: {
          email: this.currentUser.email,
          name: this.currentUser.displayName || ''
        },
        theme: {
          color: '#22C55E'
        }
      };

      const rzp = new Razorpay(options);
      rzp.open();

      // Close payment modal
      document.getElementById('paymentModal').classList.remove('active');

    } catch (error) {
      console.error('Payment error:', error);
      this.showToast(error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async verifyPayment(paymentResponse, inrAmount, usdAmount) {
    this.showLoading(true);

    try {
      const response = await fetch('/api/payment/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...paymentResponse,
          uid: this.currentUser.uid,
          inrAmount,
          usdtAmount: usdAmount,
          rate: this.exchangeRate
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.showToast('Payment successful! USDT credited to your wallet.', 'success');
        this.loadUserProfile();
        this.loadTransactions();
        
        // Clear converter form
        document.getElementById('sendAmount').value = '1000';
        this.updateConverter();
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Payment verification error:', error);
      this.showToast('Payment verification failed', 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async loadUserProfile() {
    if (!this.currentUser) return;

    try {
      const response = await fetch(`/api/user/${this.currentUser.uid}`);
      const data = await response.json();
      
      if (data.success) {
        this.userProfile = data.user;
        this.updateDashboard();
        this.updateProfilePage();
      }
    } catch (error) {
      console.error('Load profile error:', error);
    }
  }

  updateDashboard() {
    if (!this.userProfile) return;

    // Update balance
    document.getElementById('totalBalance').textContent = 
      this.userProfile.balance.toFixed(6);
    document.getElementById('walletBalance').textContent = 
      `${this.userProfile.balance.toFixed(6)} USDT`;

    // Update wallet address
    document.getElementById('walletAddress').textContent = 
      this.userProfile.walletAddress;

    // Update KYC status
    this.updateKYCStatus(this.userProfile.kycStatus);

    // Update transaction count
    document.getElementById('totalTransactions').textContent = 
      this.transactions.length;
  }

  updateKYCStatus(status) {
    const statusText = document.getElementById('kycStatusText');
    const statusIcon = document.getElementById('kycStatusIcon');
    const statusBadge = document.querySelector('.status-badge');
    const kycForm = document.getElementById('kycForm');

    statusText.textContent = status.charAt(0).toUpperCase() + status.slice(1);
    
    // Remove all status classes
    statusBadge.className = 'status-badge';
    
    switch (status) {
      case 'verified':
        statusIcon.textContent = '✅';
        statusBadge.classList.add('verified');
        kycForm.style.display = 'none';
        break;
      case 'rejected':
        statusIcon.textContent = '❌';
        statusBadge.classList.add('rejected');
        kycForm.style.display = 'block';
        break;
      default:
        statusIcon.textContent = '⏳';
        statusBadge.classList.add('pending');
        kycForm.style.display = 'block';
    }

    this.kycStatus = status;
  }

  async submitKYC() {
    if (!this.currentUser) return;

    const form = document.getElementById('kycUploadForm');
    const formData = new FormData(form);
    formData.append('uid', this.currentUser.uid);

    this.showLoading(true);

    try {
      const response = await fetch('/api/kyc/upload', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      
      if (data.success) {
        this.showToast('KYC documents submitted successfully!', 'success');
        this.checkKYCStatus();
        form.reset();
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('KYC submission error:', error);
      this.showToast(error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  async checkKYCStatus() {
    if (!this.currentUser) return;

    try {
      const response = await fetch(`/api/kyc/status/${this.currentUser.uid}`);
      const data = await response.json();
      
      if (data.success) {
        this.updateKYCStatus(data.kycStatus);
      }
    } catch (error) {
      console.error('KYC status check error:', error);
    }
  }

  async loadTransactions() {
    if (!this.currentUser) return;

    try {
      const response = await fetch(`/api/transactions/${this.currentUser.uid}`);
      const data = await response.json();
      
      if (data.success) {
        this.transactions = data.transactions;
        this.renderTransactions();
      }
    } catch (error) {
      console.error('Load transactions error:', error);
    }
  }

  renderTransactions() {
    const container = document.getElementById('transactionsList');
    
    if (this.transactions.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <span class="empty-icon">📝</span>
          <span class="empty-text">No transactions yet</span>
        </div>
      `;
      return;
    }

    container.innerHTML = this.transactions.map(tx => `
      <div class="table-row">
        <div class="table-cell">${new Date(tx.createdAt).toLocaleDateString()}</div>
        <div class="table-cell">${tx.type.toUpperCase()}</div>
        <div class="table-cell">
          ${tx.type === 'buy' ? `₹${tx.inrAmount?.toLocaleString() || 0}` : ''}
          ${tx.usdtAmount ? `${tx.usdtAmount} USDT` : ''}
        </div>
        <div class="table-cell">
          <span class="status-badge ${tx.status}">${tx.status}</span>
        </div>
        <div class="table-cell">
          ${tx.txHash ? `<code>${tx.txHash.substring(0, 10)}...</code>` : '-'}
        </div>
      </div>
    `).join('');
  }

  async initiateWalletTransfer() {
    if (!this.currentUser) return;

    const recipientAddress = document.getElementById('recipientAddress').value;
    const amount = parseFloat(document.getElementById('transferAmount').value);

    if (!recipientAddress || !amount || amount <= 0) {
      this.showToast('Please enter valid transfer details', 'error');
      return;
    }

    if (amount > this.userProfile.balance) {
      this.showToast('Insufficient balance', 'error');
      return;
    }

    this.showLoading(true);

    try {
      const response = await fetch('/api/wallet/transfer', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          uid: this.currentUser.uid,
          toAddress: recipientAddress,
          amount: amount
        })
      });

      const data = await response.json();
      
      if (data.success) {
        this.showToast('Transfer successful!', 'success');
        this.userProfile.balance = data.newBalance;
        this.updateDashboard();
        this.loadTransactions();
        
        // Clear form
        document.getElementById('transferForm').reset();
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Transfer error:', error);
      this.showToast(error.message, 'error');
    } finally {
      this.showLoading(false);
    }
  }

  copyWalletAddress() {
    const address = document.getElementById('walletAddress').textContent;
    
    if (address && address !== 'Connect wallet to view address') {
      navigator.clipboard.writeText(address).then(() => {
        this.showToast('Wallet address copied!', 'success');
      }).catch(() => {
        this.showToast('Failed to copy address', 'error');
      });
    }
  }

  showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'toastSlideOut 0.3s ease-in forwards';
      setTimeout(() => {
        if (container.contains(toast)) {
          container.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }

  showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
      overlay.classList.remove('hidden');
    } else {
      overlay.classList.add('hidden');
    }
  }
}

// Add toast slide out animation
const style = document.createElement('style');
style.textContent = `
  @keyframes toastSlideOut {
    from {
      opacity: 1;
      transform: translateX(0);
    }
    to {
      opacity: 0;
      transform: translateX(100%);
    }
  }
`;
document.head.appendChild(style);

// Initialize application
document.addEventListener('DOMContentLoaded', () => {
  window.app = new AppState();
  console.log('🚀 Enkrypt Enterprise application initialized!');
});

// Handle network status
window.addEventListener('online', () => {
  if (window.app) {
    window.app.showToast('Connection restored!', 'success');
    window.app.fetchExchangeRate();
  }
});

window.addEventListener('offline', () => {
  if (window.app) {
    window.app.showToast('You are offline', 'warning');
  }
});