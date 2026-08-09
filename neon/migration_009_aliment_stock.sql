ALTER TABLE public.feed_records
  ADD COLUMN IF NOT EXISTS stock_item_id UUID REFERENCES public.stock_items ON DELETE SET NULL;
