# Environment Setup Guide for OilSync

## Required Environment Variables

### For Production Email (Mailtrap)

Set these environment variables in your Netlify dashboard under Site settings → Environment variables:

```bash
MAILTRAP_HOST=smtp.mailtrap.io
MAILTRAP_PORT=587
MAILTRAP_USER=your_mailtrap_username
MAILTRAP_PASS=your_mailtrap_password
```

### For Production SMS (Twilio)

```bash
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NUMBER=your_twilio_phone_number
```

### For Database (Neon)

```bash
DATABASE_URL=postgresql://username:password@host:port/database
```

### For Authentication

```bash
JWT_SECRET=your_super_secret_jwt_key_here
BCRYPT_ROUNDS=12
```

## Setting up Mailtrap for Production

1. **Create Mailtrap Account**

   - Go to [Mailtrap.io](https://mailtrap.io)
   - Sign up for a free account
   - Verify your email

2. **Get SMTP Credentials**

   - Go to Email Testing → Inboxes
   - Create a new inbox or use the default one
   - Click on the inbox
   - Go to SMTP Settings
   - Copy the credentials:
     - Host: `smtp.mailtrap.io`
     - Port: `587`
     - Username: (your username)
     - Password: (your password)

3. **Set Environment Variables in Netlify**

   - Go to your Netlify site dashboard
   - Navigate to Site settings → Environment variables
   - Add the four Mailtrap variables listed above

4. **Deploy and Test**
   - Redeploy your site
   - Test password reset functionality
   - Check Netlify function logs to verify email sending

## Setting up Twilio for SMS

1. **Create Twilio Account**

   - Go to [Twilio.com](https://twilio.com)
   - Sign up for a free trial account
   - Get a phone number

2. **Get API Credentials**

   - Go to Console Dashboard
   - Copy Account SID and Auth Token
   - Note your Twilio phone number

3. **Set Environment Variables**
   - Add the three Twilio variables in Netlify

## Setting up Neon Database

1. **Create Neon Account**

   - Go to [Neon.tech](https://neon.tech)
   - Create a free account
   - Create a new project

2. **Get Connection String**

   - Copy the connection string from your dashboard
   - Set DATABASE_URL in Netlify

3. **Run Database Schema**
   - Use the provided `database/schema.sql` file
   - Connect to your Neon database and execute the schema

## Verifying Setup

### Check Email Configuration

Visit: `https://your-site.netlify.app/api/health/detailed`

This endpoint will test all services including email.

### Check Logs

1. Go to Netlify Dashboard
2. Navigate to Functions
3. Click on your function
4. View logs to see email sending attempts

### Test Password Reset

1. Go to `/forgot-password`
2. Enter an email address
3. Check function logs for the OTP code
4. In production, check your Mailtrap inbox

## Troubleshooting

### Email Not Sending

- Verify all MAILTRAP\_\* environment variables are set
- Check Netlify function logs for error messages
- Ensure Mailtrap account is active

### SMS Not Working

- Verify TWILIO\_\* environment variables
- Check if Twilio account has sufficient credits
- Verify phone number format

### Database Connection Issues

- Verify DATABASE_URL format
- Check Neon dashboard for connection issues
- Ensure database schema has been executed

## Development vs Production

### Development Mode

- Email codes are logged to console and Netlify logs
- All services use mock implementations
- Easy testing without external dependencies

### Production Mode

- Real emails sent via Mailtrap
- Real SMS sent via Twilio
- Real database operations via Neon

Environment variables automatically switch between modes.
