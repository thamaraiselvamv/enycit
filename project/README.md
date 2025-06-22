# INR to USDT Cryptocurrency Converter

A full-stack cryptocurrency conversion platform that allows users to convert Indian Rupees (INR) to Tether USD (USDT) with KYC verification, secure payments, and wallet management.

## 🚀 Features

### Core Functionality
- **Live Exchange Rates**: Real-time INR to USDT conversion using CoinGecko API
- **User Authentication**: Firebase Authentication with email/password
- **KYC Verification**: Automated document verification using ShuftiPro/HyperVerge
- **Secure Payments**: INR payments via Razorpay UPI gateway
- **Crypto Wallet**: USDT (TRC20) wallet generation and management
- **Transaction History**: Complete transaction tracking and history

### User Features
- **Responsive Design**: Mobile-first responsive interface
- **Real-time Updates**: Live exchange rates with auto-refresh
- **Quick Conversion**: Pre-set amount buttons for fast conversion
- **Secure Transfers**: Send USDT to external wallets
- **Dashboard**: Comprehensive user dashboard with statistics
- **Toast Notifications**: Real-time feedback for all actions

### Security Features
- **KYC Compliance**: Mandatory identity verification
- **Secure Authentication**: Firebase Auth integration
- **Payment Verification**: Razorpay signature verification
- **Transaction Tracking**: Complete audit trail
- **Error Handling**: Comprehensive error management

## 🛠️ Technology Stack

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JavaScript**: No frameworks, pure JS
- **Firebase SDK**: Authentication and Firestore

### Backend
- **Node.js**: Server runtime
- **Express.js**: Web framework
- **Firebase Admin**: Server-side Firebase integration
- **Multer**: File upload handling

### APIs & Services
- **CoinGecko API**: Cryptocurrency exchange rates
- **Firebase Auth**: User authentication
- **Firebase Firestore**: Database (configured for future use)
- **Razorpay**: Payment processing
- **ShuftiPro/HyperVerge**: KYC verification (simulated)
- **Tatum/Moralis**: Crypto wallet management (simulated)

## 📦 Installation

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Firebase project
- Razorpay account (test mode)

### Setup Steps

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd inr-usdt-converter
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your API keys:
   - Firebase configuration
   - Razorpay keys
   - KYC provider keys
   - Crypto wallet API keys

4. **Firebase Setup**
   - Create a Firebase project
   - Enable Authentication (Email/Password)
   - Set up Firestore database
   - Download service account key
   - Update Firebase config in `public/app.js`

5. **Start the application**
   ```bash
   npm start
   ```

6. **Access the application**
   Open `http://localhost:3000` in your browser

## 🔧 Configuration

### Firebase Configuration
Update the Firebase config in `public/app.js`:

```javascript
const firebaseConfig = {
  apiKey: "your-api-key",
  authDomain: "your-project.firebaseapp.com",
  projectId: "your-project-id",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "your-app-id"
};
```

### Razorpay Configuration
1. Create a Razorpay account
2. Get test API keys
3. Update keys in `.env` file
4. Update key in `public/app.js`

### KYC Provider Setup
1. Sign up for ShuftiPro or HyperVerge
2. Get API credentials
3. Update configuration in `.env`
4. Implement webhook endpoints for status updates

## 📱 Usage

### User Registration
1. Click "Sign Up" to create an account
2. Verify email address
3. Complete profile setup

### KYC Verification
1. Navigate to Dashboard
2. Upload required documents:
   - Aadhaar Card
   - PAN Card
   - Selfie with documents
3. Wait for automated verification

### Converting INR to USDT
1. Enter INR amount or use quick buttons
2. Review conversion rate and USDT amount
3. Click "Convert Now"
4. Complete payment via Razorpay
5. USDT credited to wallet upon confirmation

### Wallet Management
1. View wallet address and balance
2. Send USDT to external addresses
3. Track all transactions in history

## 🔒 Security Considerations

### Production Deployment
- Use HTTPS for all communications
- Implement rate limiting
- Add CSRF protection
- Use environment variables for secrets
- Enable Firebase security rules
- Implement proper error logging

### KYC Compliance
- Store documents securely
- Implement data retention policies
- Ensure GDPR compliance
- Regular security audits

## 🚀 Deployment

### Hostinger Deployment
1. Upload files to hosting directory
2. Install Node.js on server
3. Set up environment variables
4. Configure domain and SSL
5. Start the application with PM2

### Environment Variables
Ensure all production environment variables are set:
- Database connections
- API keys
- Security secrets
- Domain configurations

## 📊 API Endpoints

### Authentication
- `POST /api/user/register` - Register new user
- `GET /api/user/:uid` - Get user profile

### Exchange
- `GET /api/exchange-rate` - Get current INR to USDT rate

### KYC
- `POST /api/kyc/upload` - Upload KYC documents
- `GET /api/kyc/status/:uid` - Get KYC status

### Payments
- `POST /api/payment/create-order` - Create Razorpay order
- `POST /api/payment/verify` - Verify payment

### Wallet
- `POST /api/wallet/transfer` - Transfer USDT
- `GET /api/transactions/:uid` - Get transaction history

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## ⚠️ Disclaimer

This application is for educational and demonstration purposes. For production use:
- Obtain proper cryptocurrency licenses
- Implement comprehensive security measures
- Ensure regulatory compliance
- Use production-grade infrastructure
- Implement proper monitoring and logging

## 📞 Support

For support and questions:
- Create an issue on GitHub
- Check the documentation
- Review the FAQ section

---

**Note**: This application uses test/sandbox modes for all payment and KYC services. Ensure proper production configurations before live deployment.