# Withdrawal Feature - Setup Instructions

## Quick Setup

The withdrawal feature has been implemented! Follow these steps to complete the setup:

### Step 1: Run Database Migration

You need to create the `withdrawals` table in your Supabase database.

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to your Supabase project dashboard
2. Click on "SQL Editor" in the left sidebar
3. Click "New Query"
4. Copy the entire contents of `supabase/migration_withdrawals.sql`
5. Paste into the SQL editor
6. Click "Run" or press Ctrl+Enter

**Option B: Using Supabase CLI (if installed)**

```bash
# If you have Supabase CLI installed
supabase db push
```

### Step 2: Test the Feature

1. **Start your development server:**
   ```bash
   npm run dev
   ```

2. **Log in as a photographer** who has completed Stripe Connect onboarding

3. **Navigate to Dashboard → Sales tab**

4. **Click "Withdraw Funds"** button (green button with wallet icon)

5. **Test the withdrawal flow:**
   - View your available balance
   - Enter an amount or use quick buttons (25%, 50%, 75%, Max)
   - Click "Withdraw Funds"
   - Check withdrawal appears in history

### Step 3: Verify in Stripe Dashboard

1. Go to your Stripe Dashboard (test mode)
2. Navigate to Connect → Accounts
3. Find the photographer's account
4. Check that the payout was created

---

## What Was Built

✅ **Database Table** - `withdrawals` table with RLS policies  
✅ **Stripe Functions** - Balance, payout creation, and history  
✅ **Withdrawal Modal** - Full UI with balance display and form  
✅ **Dashboard Integration** - "Withdraw Funds" button in Sales tab  

---

## Important Notes

- **Stripe Test Mode**: All testing uses Stripe test mode
- **Minimum Withdrawal**: $1.00
- **Stripe Connect Required**: Photographers must complete onboarding first
- **Payout Timing**: Test mode is instant; production takes 2-3 business days

---

## Need Help?

If you encounter any issues:

1. Check browser console for errors
2. Verify Stripe Connect is properly configured
3. Ensure the migration ran successfully
4. Check Supabase logs for database errors

Refer to `walkthrough.md` for detailed documentation.
