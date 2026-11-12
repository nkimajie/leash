-- Delivery tracking: once a purchase is paid, the stand-in store ships it. The carrier, tracking number,
-- address (from your saved PayPal account) and arrival date are kept here, and the tracking number is
-- also added to the real PayPal order. Null until it ships.
alter table decisions add column if not exists shipping jsonb;
