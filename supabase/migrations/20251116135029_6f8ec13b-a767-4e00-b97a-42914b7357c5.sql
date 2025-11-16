-- Create printing_orders table
CREATE TABLE public.printing_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  phone_number TEXT NOT NULL,
  order_name TEXT NOT NULL,
  is_paid BOOLEAN NOT NULL DEFAULT false,
  is_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.printing_orders ENABLE ROW LEVEL SECURITY;

-- Create policy for all operations (temporary - should be updated when auth is implemented)
CREATE POLICY "Allow all operations on printing_orders" 
ON public.printing_orders 
FOR ALL 
USING (true) 
WITH CHECK (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_printing_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_printing_orders_updated_at
BEFORE UPDATE ON public.printing_orders
FOR EACH ROW
EXECUTE FUNCTION public.update_printing_orders_updated_at();