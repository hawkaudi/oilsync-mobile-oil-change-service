# Database Setup Instructions - URGENT

## Problem Fixed 🔧

The registration was only saving to memory instead of your Neon database. I've implemented:

✅ **Real PostgreSQL client integration** with pg library  
✅ **Proper user authentication** with bcrypt password hashing  
✅ **JWT token management** with database sessions  
✅ **OTP verification** stored in database  
✅ **Database health checks** for monitoring

## Required: Set Your Real Database URL

**Important:** The app currently has a placeholder DATABASE_URL. You need to replace it with your actual Neon database connection string.

### Step 1: Get Your Neon Database URL

1. Go to [Neon.tech](https://neon.tech)
2. Sign in to your dashboard
3. Select your project
4. Click "Dashboard" → "Connection Details"
5. Copy the **Connection String** (it looks like):
   ```
   postgresql://username:password@ep-xyz123.pooler.neon.tech:5432/dbname?sslmode=require
   ```

### Step 2: Update Environment Variables in Netlify

1. Go to your **Netlify Dashboard**
2. Select your site
3. Go to **Site settings** → **Environment variables**
4. Find `DATABASE_URL` and click **Edit**
5. Replace the placeholder with your **real Neon connection string**
6. Click **Save**

### Step 3: Set Up Your Database Schema

1. Connect to your Neon database using their console or a PostgreSQL client
2. Run the complete schema from `database/schema.sql`
3. This creates all the required tables (users, otp_codes, bookings, etc.)

### Step 4: Redeploy

1. Click **Deploy** in your Netlify dashboard to redeploy with the new DATABASE_URL
2. Check the function logs to verify database connection

## Testing Database Connection

After setup, test the connection:

1. Visit: `https://your-site.netlify.app/api/health/detailed`
2. Check that `database.status` shows `"healthy"`
3. Try registering a new user
4. Check the logs for `🔵 [DATABASE]` messages instead of memory storage

## What Changed

### Before (Memory Storage):

```javascript
const users = new Map(); // ❌ Memory only
users.set(email, user); // ❌ Lost on restart
```

### Now (Database Storage):

```javascript
await createUser({
  // ✅ Real database
  firstName,
  lastName,
  email,
  phone,
  password,
});
```

### New Database Services:

- `server/database/connection.ts` - PostgreSQL connection pool
- `server/services/userService.ts` - User management with bcrypt
- `server/services/otpService.ts` - OTP verification in database

### Enhanced Security:

- **bcrypt password hashing** (12 rounds)
- **JWT tokens** with database sessions
- **OTP codes** with expiration and attempt limits
- **Connection pooling** with SSL for production

## Verification Steps

1. **Database Connection**: Health check should show "healthy" database
2. **User Registration**: New users should persist after server restart
3. **Authentication**: Login should work with hashed passwords
4. **OTP System**: Password reset should use database-stored codes

## Troubleshooting

### Database Connection Failed

- Verify your Neon connection string is correct
- Check that your Neon database is active
- Ensure the schema has been applied

### Registration Still Failing

- Check Netlify function logs for specific error messages
- Verify environment variables are set correctly
- Test the health endpoint first

### Need Help?

- Check `ENVIRONMENT_SETUP.md` for complete setup guide
- Monitor Netlify function logs for detailed error messages
- Verify all environment variables are properly set

**The fix is complete - you just need to provide your real Neon database URL!** 🚀
