import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import multer from 'multer';
import Razorpay from 'razorpay';
import axios from 'axios';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';
import { mkdirSync } from 'fs';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(join(__dirname, 'public')));

// Create uploads directory
try {
  mkdirSync('uploads', { recursive: true });
} catch (err) {
  console.log('Uploads directory already exists or created');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_1234567890',
  key_secret: process.env.RAZORPAY_KEY_SECRET || 'test_secret_key'
});

// In-memory storage (replace with Firebase Firestore in production)
let users = new Map();
let transactions = new Map();
let kycRequests = new Map();

// API Routes

// Get live INR to USDT rate
app.get('/api/exchange-rate', async (req, res) => {
  try {
    const response = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=inr');
    const rate = response.data.tether.inr;
    res.json({ 
      success: true, 
      rate: 1 / rate, // INR to USDT conversion
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error fetching exchange rate:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch exchange rate',
      fallbackRate: 0.012 // Fallback rate
    });
  }
});

// User registration/profile
app.post('/api/user/register', (req, res) => {
  try {
    const { uid, email, displayName } = req.body;
    
    if (!uid || !email) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Generate USDT wallet address (simulated)
    const walletAddress = generateUSDTWallet();
    
    const user = {
      uid,
      email,
      displayName: displayName || '',
      walletAddress,
      balance: 0,
      kycStatus: 'pending',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    users.set(uid, user);
    
    res.json({ 
      success: true, 
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        balance: user.balance,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
});

// Get user profile
app.get('/api/user/:uid', (req, res) => {
  try {
    const { uid } = req.params;
    const user = users.get(uid);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({ 
      success: true, 
      user: {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        walletAddress: user.walletAddress,
        balance: user.balance,
        kycStatus: user.kycStatus
      }
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
});

// KYC document upload
app.post('/api/kyc/upload', upload.fields([
  { name: 'aadhaar', maxCount: 1 },
  { name: 'pan', maxCount: 1 },
  { name: 'selfie', maxCount: 1 }
]), async (req, res) => {
  try {
    const { uid } = req.body;
    
    if (!uid) {
      return res.status(400).json({ success: false, error: 'User ID required' });
    }

    const files = req.files;
    if (!files.aadhaar || !files.pan || !files.selfie) {
      return res.status(400).json({ success: false, error: 'All documents required' });
    }

    // Simulate KYC verification with ShuftiPro/HyperVerge
    const kycResult = await simulateKYCVerification({
      aadhaar: files.aadhaar[0],
      pan: files.pan[0],
      selfie: files.selfie[0]
    });

    const kycRequest = {
      id: uuidv4(),
      uid,
      documents: {
        aadhaar: files.aadhaar[0].filename,
        pan: files.pan[0].filename,
        selfie: files.selfie[0].filename
      },
      status: kycResult.status,
      verificationId: kycResult.verificationId,
      submittedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    kycRequests.set(kycRequest.id, kycRequest);

    // Update user KYC status
    const user = users.get(uid);
    if (user) {
      user.kycStatus = kycResult.status;
      user.updatedAt = new Date().toISOString();
      users.set(uid, user);
    }

    res.json({ 
      success: true, 
      kycRequest: {
        id: kycRequest.id,
        status: kycRequest.status,
        verificationId: kycRequest.verificationId
      }
    });
  } catch (error) {
    console.error('KYC upload error:', error);
    res.status(500).json({ success: false, error: 'KYC upload failed' });
  }
});

// Get KYC status
app.get('/api/kyc/status/:uid', (req, res) => {
  try {
    const { uid } = req.params;
    const user = users.get(uid);
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Find latest KYC request for user
    const userKycRequests = Array.from(kycRequests.values())
      .filter(req => req.uid === uid)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));

    const latestKyc = userKycRequests[0];

    res.json({ 
      success: true, 
      kycStatus: user.kycStatus,
      kycRequest: latestKyc ? {
        id: latestKyc.id,
        status: latestKyc.status,
        submittedAt: latestKyc.submittedAt,
        updatedAt: latestKyc.updatedAt
      } : null
    });
  } catch (error) {
    console.error('KYC status error:', error);
    res.status(500).json({ success: false, error: 'Failed to get KYC status' });
  }
});

// Create Razorpay order
app.post('/api/payment/create-order', async (req, res) => {
  try {
    const { amount, currency = 'INR', uid } = req.body;
    
    if (!amount || !uid) {
      return res.status(400).json({ success: false, error: 'Amount and user ID required' });
    }

    const user = users.get(uid);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.kycStatus !== 'verified') {
      return res.status(403).json({ success: false, error: 'KYC verification required' });
    }

    const options = {
      amount: Math.round(amount * 100), // Amount in paise
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1
    };

    const order = await razorpay.orders.create(options);
    
    res.json({ 
      success: true, 
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ success: false, error: 'Failed to create order' });
  }
});

// Verify payment and process USDT transfer
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      uid,
      usdtAmount 
    } = req.body;

    // Verify Razorpay signature
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET || 'test_secret_key')
      .update(body.toString())
      .digest('hex');

    const isAuthentic = expectedSignature === razorpay_signature;

    if (!isAuthentic) {
      return res.status(400).json({ success: false, error: 'Invalid payment signature' });
    }

    // Process USDT transfer
    const transferResult = await simulateUSDTTransfer(uid, usdtAmount);
    
    // Create transaction record
    const transaction = {
      id: uuidv4(),
      uid,
      type: 'buy',
      inrAmount: req.body.inrAmount || 0,
      usdtAmount,
      rate: req.body.rate || 0,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      status: transferResult.success ? 'completed' : 'failed',
      txHash: transferResult.txHash,
      createdAt: new Date().toISOString()
    };

    transactions.set(transaction.id, transaction);

    // Update user balance
    const user = users.get(uid);
    if (user && transferResult.success) {
      user.balance += parseFloat(usdtAmount);
      user.updatedAt = new Date().toISOString();
      users.set(uid, user);
    }

    res.json({ 
      success: true, 
      transaction: {
        id: transaction.id,
        status: transaction.status,
        txHash: transaction.txHash,
        usdtAmount: transaction.usdtAmount
      }
    });
  } catch (error) {
    console.error('Payment verification error:', error);
    res.status(500).json({ success: false, error: 'Payment verification failed' });
  }
});

// Get transaction history
app.get('/api/transactions/:uid', (req, res) => {
  try {
    const { uid } = req.params;
    const userTransactions = Array.from(transactions.values())
      .filter(tx => tx.uid === uid)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    res.json({ 
      success: true, 
      transactions: userTransactions.map(tx => ({
        id: tx.id,
        type: tx.type,
        inrAmount: tx.inrAmount,
        usdtAmount: tx.usdtAmount,
        rate: tx.rate,
        status: tx.status,
        txHash: tx.txHash,
        createdAt: tx.createdAt
      }))
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ success: false, error: 'Failed to get transactions' });
  }
});

// Simulate USDT wallet transfer
app.post('/api/wallet/transfer', async (req, res) => {
  try {
    const { uid, toAddress, amount } = req.body;
    
    if (!uid || !toAddress || !amount) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const user = users.get(uid);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    if (user.balance < parseFloat(amount)) {
      return res.status(400).json({ success: false, error: 'Insufficient balance' });
    }

    // Simulate USDT transfer using Tatum/Moralis
    const transferResult = await simulateExternalUSDTTransfer(user.walletAddress, toAddress, amount);
    
    if (transferResult.success) {
      // Update user balance
      user.balance -= parseFloat(amount);
      user.updatedAt = new Date().toISOString();
      users.set(uid, user);

      // Create transaction record
      const transaction = {
        id: uuidv4(),
        uid,
        type: 'transfer',
        usdtAmount: amount,
        fromAddress: user.walletAddress,
        toAddress,
        status: 'completed',
        txHash: transferResult.txHash,
        createdAt: new Date().toISOString()
      };

      transactions.set(transaction.id, transaction);
    }

    res.json({ 
      success: transferResult.success, 
      txHash: transferResult.txHash,
      newBalance: user.balance
    });
  } catch (error) {
    console.error('Transfer error:', error);
    res.status(500).json({ success: false, error: 'Transfer failed' });
  }
});

// Helper functions

function generateUSDTWallet() {
  // Simulate USDT TRC20 wallet generation
  const chars = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
  let result = 'T';
  for (let i = 0; i < 33; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function simulateKYCVerification(documents) {
  // Simulate KYC verification process
  return new Promise((resolve) => {
    setTimeout(() => {
      const isVerified = Math.random() > 0.3; // 70% success rate
      resolve({
        status: isVerified ? 'verified' : 'rejected',
        verificationId: `kyc_${uuidv4()}`,
        confidence: Math.random() * 100
      });
    }, 2000);
  });
}

async function simulateUSDTTransfer(uid, amount) {
  // Simulate USDT transfer to user wallet
  return new Promise((resolve) => {
    setTimeout(() => {
      const success = Math.random() > 0.1; // 90% success rate
      resolve({
        success,
        txHash: success ? `0x${crypto.randomBytes(32).toString('hex')}` : null
      });
    }, 1000);
  });
}

async function simulateExternalUSDTTransfer(fromAddress, toAddress, amount) {
  // Simulate external USDT transfer
  return new Promise((resolve) => {
    setTimeout(() => {
      const success = Math.random() > 0.05; // 95% success rate
      resolve({
        success,
        txHash: success ? `0x${crypto.randomBytes(32).toString('hex')}` : null
      });
    }, 3000);
  });
}

// Serve static files
app.get('/', (req, res) => {
  res.sendFile(join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Enkrypt Enterprise Server running on http://localhost:${PORT}`);
  console.log('📱 Features enabled:');
  console.log('• Live INR to USDT conversion');
  console.log('• Firebase Authentication');
  console.log('• KYC verification simulation');
  console.log('• Razorpay payment integration');
  console.log('• USDT wallet simulation');
  console.log('• Transaction history');
});