# Safe Database Migration Guide for VPN Detection Feature

## Prerequisites
- Make sure you have the Supabase CLI installed
- Have access to your Supabase project dashboard

## Step 1: Backup Your Database (IMPORTANT!)

Before making any changes, create a backup:

1. Go to your Supabase Dashboard
2. Navigate to Settings → Database
3. Click "Backups"
4. Create a manual backup (or ensure you have a recent automatic backup)

## Step 2: Review the Migration

The migration file is located at: `supabase/migrations/20250106_create_user_ip_addresses.sql`

This migration will:
- Create a new table `user_ip_addresses` (won't affect existing tables)
- Add Row Level Security policies
- Create indexes for performance
- Add an update trigger for timestamps

**This is a NON-DESTRUCTIVE migration** - it only creates new structures, doesn't modify or delete existing data.

## Step 3: Test Locally First (Recommended)

If you have a local Supabase instance:

```bash
# Start local Supabase if not running
supabase start

# Apply the migration locally
supabase db push --local

# Test that it worked
supabase db diff --local
```

## Step 4: Apply to Production

### Option A: Using Supabase CLI (Recommended)

```bash
# First, link to your project if not already linked
supabase link --project-ref your-project-ref

# Check what migrations will be applied
supabase db diff

# Apply the migration
supabase db push
```

### Option B: Using Supabase Dashboard (Manual)

1. Go to your Supabase Dashboard
2. Navigate to SQL Editor
3. Copy the contents of `supabase/migrations/20250106_create_user_ip_addresses.sql`
4. Paste into the SQL Editor
5. Click "Run" to execute

## Step 5: Verify the Migration

After applying, verify everything worked:

1. In Supabase Dashboard, go to Table Editor
2. Check that `user_ip_addresses` table exists
3. Verify the columns:
   - id (uuid)
   - user_id (uuid)
   - ip_address (inet)
   - label (text)
   - is_trusted (boolean)
   - created_at (timestamp)
   - updated_at (timestamp)

4. Check RLS policies are enabled:
   - Go to Authentication → Policies
   - Find `user_ip_addresses` table
   - Verify 4 policies exist (SELECT, INSERT, UPDATE, DELETE)

## Step 6: Test the Feature

1. Run your app locally:
```bash
npm run dev
```

2. Go to Settings page (`/protected/settings`)
3. Look for "VPN & Security" section
4. Try adding your current IP address
5. Check if the VPN warning appears at the top of the page

## Rollback Instructions (If Needed)

If something goes wrong, you can safely remove the table:

```sql
-- Remove the table and all associated objects
DROP TABLE IF EXISTS public.user_ip_addresses CASCADE;

-- Remove the trigger function if it exists
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

## Troubleshooting

### Error: "permission denied for schema public"
- Make sure you're using the correct database role
- Check your Supabase project settings

### Error: "relation already exists"
- The table might already exist
- Check Table Editor to see if it's already there

### RLS policies not working
- Make sure RLS is enabled on the table
- Verify your user is authenticated when testing

### IP detection not working
- Check browser console for errors
- Verify the API endpoint `/api/check-vpn-status` is accessible
- Check that your Supabase environment variables are set correctly

## Important Notes

1. **This migration is SAFE** because it:
   - Only creates new objects
   - Doesn't modify existing tables
   - Doesn't delete any data
   - Can be rolled back easily

2. **Your existing data is NOT affected** - this only adds new functionality

3. **If you're unsure**, test on a staging environment first or create a new Supabase project for testing

## Next Steps

After successful migration:
1. Test the IP management in Settings
2. Add some known IPs
3. Check if VPN warning appears correctly
4. Monitor for any issues in production

## Support

If you encounter any issues:
1. Check the Supabase logs (Dashboard → Logs)
2. Review the browser console for errors
3. Verify all environment variables are set correctly