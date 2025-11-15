-- Create products table
CREATE TABLE public.products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transactions table
CREATE TABLE public.transactions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  total_amount DECIMAL(10, 2) NOT NULL,
  payment_amount DECIMAL(10, 2) NOT NULL,
  change_amount DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create transaction_items table
CREATE TABLE public.transaction_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  transaction_id UUID NOT NULL REFERENCES public.transactions(id) ON DELETE CASCADE,
  product_code TEXT NOT NULL,
  product_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  subtotal DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_items ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (no authentication required for POS)
CREATE POLICY "Allow all operations on products" ON public.products FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on transactions" ON public.transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all operations on transaction_items" ON public.transaction_items FOR ALL USING (true) WITH CHECK (true);

-- Create indexes for better performance
CREATE INDEX idx_products_code ON public.products(code);
CREATE INDEX idx_transactions_date ON public.transactions(transaction_date);
CREATE INDEX idx_transaction_items_transaction_id ON public.transaction_items(transaction_id);

-- Insert sample products
INSERT INTO public.products (code, name, price) VALUES
  ('P001', 'Kertas A4 80gr (1 Rim)', 50000),
  ('P002', 'Print Hitam Putih A4', 500),
  ('P003', 'Print Warna A4', 2000),
  ('P004', 'Fotocopy A4', 300),
  ('P005', 'Ballpoint Standard', 3000),
  ('P006', 'Spidol Whiteboard', 8000),
  ('P007', 'Penggaris 30cm', 5000);