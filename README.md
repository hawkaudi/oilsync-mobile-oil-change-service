<<<<<<< HEAD
# OilSync - Mobile Oil Change Service Platform

A modern, full-stack web application for booking and managing mobile oil change services. Built with React, TypeScript, Express, and PostgreSQL.

## 🚀 Features

### Customer Features
- **Easy Booking**: Book oil change service with VIN or manual vehicle entry
- **Account Management**: Register, login, and manage profile
- **Service Tracking**: Track appointment status and history
- **Mobile-First Design**: Responsive design optimized for all devices

### Admin Features
- **Dashboard**: Real-time overview of bookings, revenue, and performance
- **Booking Management**: Assign technicians and update booking status
- **Technician Management**: Manage service technicians and their schedules
- **Vehicle Database**: VIN decoder and vehicle information management

### Authentication & Security
- **Multi-Factor Authentication**: Email and SMS OTP verification
- **Password Reset**: Secure password reset with OTP verification
- **Role-Based Access**: Customer, Technician, and Admin roles
- **Session Management**: Secure JWT-based authentication

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **TailwindCSS** for styling
- **Radix UI** for accessible components
- **React Router 6** for client-side routing
- **React Query** for data fetching and caching

### Backend
- **Express.js** with TypeScript
- **PostgreSQL** (Neon) for database
- **Zod** for data validation
- **bcrypt** for password hashing
- **JWT** for authentication

### External Services
- **Neon**: PostgreSQL database hosting
- **Netlify**: Frontend hosting and deployment
- **Mailtrap**: Email testing and delivery
- **Twilio**: SMS and phone verification

## 📋 Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PostgreSQL** database access (we recommend Neon)

## 🚀 Quick Start

### 1. Clone the Repository
```bash
git clone <your-repo-url>
cd oilsync
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Database Setup

#### Option A: Using Neon (Recommended)
1. Create a free account at [Neon](https://neon.tech)
2. Create a new database project
3. Copy the connection string from your Neon dashboard
4. Run the database schema:
```bash
# Connect to your Neon database and run the schema
psql "your-neon-connection-string" -f database/schema.sql
```

#### Option B: Local PostgreSQL
1. Install PostgreSQL locally
2. Create a new database:
```bash
createdb oilsync
```
3. Run the schema:
```bash
psql oilsync -f database/schema.sql
```

### 4. Environment Configuration

Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="postgresql://username:password@host:port/database"

# Authentication
JWT_SECRET="your-super-secret-jwt-key"
BCRYPT_ROUNDS=12

# Email Service (Mailtrap)
MAILTRAP_HOST="smtp.mailtrap.io"
MAILTRAP_PORT=2525
MAILTRAP_USER="your-mailtrap-username"
MAILTRAP_PASS="your-mailtrap-password"

# SMS Service (Twilio)
TWILIO_ACCOUNT_SID="your-twilio-account-sid"
TWILIO_AUTH_TOKEN="your-twilio-auth-token"
TWILIO_PHONE_NUMBER="your-twilio-phone-number"

# Application
NODE_ENV="development"
PORT=8080
FRONTEND_URL="http://localhost:8080"
```

### 5. External Service Setup

#### Mailtrap Setup
1. Create account at [Mailtrap](https://mailtrap.io)
2. Create a new inbox
3. Copy SMTP credentials to your `.env` file

#### Twilio Setup
1. Create account at [Twilio](https://twilio.com)
2. Get a phone number
3. Copy Account SID, Auth Token, and phone number to `.env` file

#### Netlify Setup (for deployment)
1. Create account at [Netlify](https://netlify.com)
2. Connect your repository
3. Set build command: `npm run build`
4. Set publish directory: `dist/spa`

### 6. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:8080`

## 🔧 Development Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm test

# Type checking
npm run typecheck

# Format code
npm run format.fix
```

## 📁 Project Structure

```
oilsync/
├── client/                 # React frontend
│   ├── components/ui/      # Reusable UI components
│   ├── pages/             # Page components
│   ├── hooks/             # Custom React hooks
│   ├── lib/               # Utility functions
│   └── App.tsx            # Main app component
├── server/                # Express backend
│   ├── routes/            # API route handlers
│   └── index.ts           # Server configuration
├── shared/                # Shared types and utilities
│   └── api.ts             # API type definitions
├── database/              # Database files
│   └── schema.sql         # PostgreSQL schema
└── netlify/               # Netlify Functions
    └── functions/
        └── api.ts         # Netlify function handler
```

## 🗄 Database Schema

The application uses PostgreSQL with the following main tables:

- **users**: Customer, technician, and admin accounts
- **vehicles**: Customer vehicle information
- **technicians**: Additional technician details
- **bookings**: Service appointments and bookings
- **services**: Available services and pricing
- **otp_codes**: One-time passwords for verification
- **payments**: Payment transactions
- **reviews**: Customer reviews and ratings

See `database/schema.sql` for the complete schema.

## 🚀 Deployment

### Netlify (Frontend + Functions)
1. Connect your repository to Netlify
2. Set environment variables in Netlify dashboard
3. Deploy automatically on git push

### Neon (Database)
1. Database is automatically managed
2. Connection pooling included
3. Automatic backups

## 🔐 Authentication Flow

1. **Registration**: User creates account with email/phone verification
2. **Login**: Email/password with optional 2FA
3. **Password Reset**: Email/SMS OTP verification
4. **Session Management**: JWT tokens with refresh capability

## 📱 API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/send-otp` - Send OTP code
- `POST /api/auth/verify-otp` - Verify OTP code
- `POST /api/auth/reset-password` - Reset password

### Bookings
- `POST /api/bookings` - Create new booking
- `GET /api/bookings` - Get user bookings
- `GET /api/bookings/:id` - Get booking details
- `PATCH /api/bookings/:id/status` - Update booking status
- `DELETE /api/bookings/:id` - Cancel booking

### Admin
- `GET /api/admin/dashboard` - Dashboard data
- `GET /api/admin/technicians` - Manage technicians
- `POST /api/admin/assign-technician` - Assign technician to booking

## 🧪 Testing

The application includes:
- Unit tests with Vitest
- Integration tests for API endpoints
- End-to-end tests for critical user flows

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Generate coverage report
npm run test:coverage
```

## 🎨 Design System

The application uses a cohesive design system with:
- **Colors**: Primary blue theme with semantic color tokens
- **Typography**: Clear hierarchy with readable fonts
- **Components**: Accessible, reusable UI components
- **Responsive**: Mobile-first responsive design

## 🔍 Debugging & Logging

All services include comprehensive logging for debugging:

```typescript
// Example logging format
console.log(`[SERVICE] Action description for: ${identifier}`);
```

Logs are automatically sent to Netlify for serverless functions.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Add tests for new functionality
5. Commit your changes: `git commit -am 'Add new feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

If you encounter any issues:

1. Check the [Issues](https://github.com/your-repo/issues) page
2. Review the database logs in Neon dashboard
3. Check Netlify function logs for API issues
4. Verify environment variables are set correctly

## 🚀 Production Checklist

Before deploying to production:

- [ ] Set strong JWT secret
- [ ] Configure production database
- [ ] Set up email service (replace Mailtrap)
- [ ] Configure Twilio for SMS
- [ ] Set up monitoring and error tracking
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up database backups
- [ ] Test payment processing
- [ ] Review security settings

## 📈 Performance

The application is optimized for performance with:
- Code splitting and lazy loading
- Database query optimization
- Image optimization
- Caching strategies
- CDN integration via Netlify

---

Built with ❤️ by the OilSync team
=======
# Basic project starter

>>>>>>> origin/main
