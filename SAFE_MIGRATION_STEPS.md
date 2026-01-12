# Super Safe Migration Steps - VPN Detection Feature

## Important: Run These One at a Time in Supabase SQL Editor

### Step 1: Create the Table (Basic Structure Only)

```sql
-- Step 1: Just create the basic table
CREATE TABLE IF NOT EXISTS public.user_ip_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  ip_address INET NOT NULL,
  label TEXT,
  is_trusted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

✅ After running, check Table Editor to see if the table appears

### Step 2: Add Foreign Key (Links to Users Table)

```sql
-- Step 2: Add foreign key constraint
ALTER TABLE public.user_ip_addresses
ADD CONSTRAINT fk_user_ip_addresses_user
FOREIGN KEY (user_id)
REFERENCES public.users(id)
ON DELETE CASCADE;
```

✅ This links the IP addresses to users

### Step 3: Add Unique Constraint

```sql
-- Step 3: Prevent duplicate IP addresses per user
ALTER TABLE public.user_ip_addresses
ADD CONSTRAINT unique_user_ip
UNIQUE(user_id, ip_address);
```

✅ This prevents users from adding the same IP twice

### Step 4: Add Indexes for Performance

```sql
-- Step 4: Add indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_ip_addresses_user_id
ON public.user_ip_addresses(user_id);

CREATE INDEX IF NOT EXISTS idx_user_ip_addresses_ip
ON public.user_ip_addresses(ip_address);
```

✅ This makes lookups faster

### Step 5: Enable Row Level Security

```sql
-- Step 5: Enable RLS
ALTER TABLE public.user_ip_addresses ENABLE ROW LEVEL SECURITY;
```

✅ This secures the table

### Step 6: Add RLS Policies (One at a Time)

```sql
-- Step 6a: Users can VIEW their own IPs
CREATE POLICY "Users can view own IPs" ON public.user_ip_addresses
FOR SELECT
USING (auth.uid() = user_id);
```

```sql
-- Step 6b: Users can ADD their own IPs
CREATE POLICY "Users can insert own IPs" ON public.user_ip_addresses
FOR INSERT
WITH CHECK (auth.uid() = user_id);
```

```sql
-- Step 6c: Users can UPDATE their own IPs
CREATE POLICY "Users can update own IPs" ON public.user_ip_addresses
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
```

```sql
-- Step 6d: Users can DELETE their own IPs
CREATE POLICY "Users can delete own IPs" ON public.user_ip_addresses
FOR DELETE
USING (auth.uid() = user_id);
```

✅ Each policy secures a different operation

### Step 7: Add Auto-Update Trigger (Optional)

```sql
-- Step 7a: Create function for auto-updating timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

```sql
-- Step 7b: Create trigger
CREATE TRIGGER update_user_ip_addresses_updated_at
BEFORE UPDATE ON public.user_ip_addresses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();
```

✅ This automatically updates the updated_at field

## How to Test Each Step

After EACH step above:

1. Go to Table Editor
2. Check the `user_ip_addresses` table
3. Try to insert a test row manually
4. Delete the test row

## If Something Goes Wrong

At any point, you can undo everything with:

```sql
-- Emergency rollback (removes everything)
DROP TABLE IF EXISTS public.user_ip_addresses CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;
```

## Testing the Feature Before Going Live

1. **Test with your account first**:

   - Add the table
   - Go to your app's Settings page
   - Try adding an IP
   - See if it saves correctly

2. **Check the Table Editor**:

   - Verify data is being saved
   - Check that user_id matches your user

3. **Test the VPN warning**:
   - Add your current IP
   - Refresh the page
   - Should see the warning bar

## When You're Confident

Once you've tested with your account and everything works:

- The feature is ready for other users
- No existing data or tables are affected
- Users won't see any changes until they visit Settings

## Why This is SAFE

✅ **Non-destructive**: Only creates new things, doesn't modify existing data
✅ **Isolated**: New table doesn't interact with existing tables except through foreign key
✅ **Reversible**: Can be completely removed without affecting anything else
✅ **Optional**: Users don't have to use this feature
✅ **Tested**: You can test with your account first before others use it
