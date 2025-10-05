-- Create table for storing user's known IP addresses
CREATE TABLE IF NOT EXISTS public.user_ip_addresses (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  ip_address INET NOT NULL,
  label TEXT, -- Optional label like "Home", "Work", etc.
  is_trusted BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, ip_address)
);

-- Create index for faster lookups
CREATE INDEX idx_user_ip_addresses_user_id ON public.user_ip_addresses(user_id);
CREATE INDEX idx_user_ip_addresses_ip ON public.user_ip_addresses(ip_address);

-- Enable Row Level Security
ALTER TABLE public.user_ip_addresses ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to manage their own IP addresses
CREATE POLICY "Users can view their own IP addresses" ON public.user_ip_addresses
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own IP addresses" ON public.user_ip_addresses
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own IP addresses" ON public.user_ip_addresses
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own IP addresses" ON public.user_ip_addresses
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update the updated_at column
CREATE TRIGGER update_user_ip_addresses_updated_at
  BEFORE UPDATE ON public.user_ip_addresses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();