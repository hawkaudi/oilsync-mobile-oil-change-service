# 🐘 Neon PostgreSQL Setup Guide

## Quick Setup (2 minutes)

### 1. Get Your Neon Connection String

- Go to [Neon Console](https://console.neon.tech/)
- Select your project or create a new one
- Go to "Connection Details"
- Copy the **PostgreSQL connection string** (looks like):
  ```
  postgresql://username:password@ep-xxxxx.us-east-1.pooler.neon.tech/database?sslmode=require
  ```

### 2. Set Environment Variable in Builder.io

In Builder.io interface:

1. Use DevServerControl tool
2. Set environment variable:
   - **Name**: `DATABASE_URL`
   - **Value**: Your Neon connection string from step 1

### 3. Restart Server

The system will automatically:

- ✅ Connect to your Neon database
- ✅ Create all necessary tables
- ✅ Seed initial vehicle data
- ✅ Enable authentication with real persistence

## What Tables Get Created

### `users` table:

- User accounts with authentication
- Email/phone verification status
- Roles (customer, admin, technician)

### `vehicle_makes` table:

- Audi, Volkswagen, Porsche

### `vehicle_models` table:

- A3, A4, A5, Q3, Q5 (Audi)
- Golf, Jetta, Tiguan (Volkswagen)
- 911, Cayenne, Macan (Porsche)

## Benefits of Using Neon

✅ **Persistent Data**: Survives server restarts
✅ **Real Authentication**: Actual user accounts
✅ **Verification Tracking**: Email/phone status saved
✅ **Vehicle Database**: Real model/year data
✅ **Production Ready**: Scales automatically

## Current Status

**Before Setup**: Using temporary in-memory database
**After Setup**: Using persistent Neon PostgreSQL

## Test Once Setup Complete

**Login Credentials** (after creating account):

- Register a new account through the UI
- Verify email/phone through the modals
- Login with your credentials

**Vehicle Selection**:

- Choose from real database-backed makes/models
- VIN decoding for Audi/VW/Porsche
- Persistent vehicle preferences

## Need Help?

1. Check Neon connection string format
2. Verify SSL is enabled (?sslmode=require)
3. Check Builder.io logs for connection status
4. Contact Neon support for database issues
