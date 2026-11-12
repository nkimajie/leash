-- Leash remembers: each request keeps Leash's reply, so the next request knows what was said and,
-- through the decisions that point back to it, what was really bought or paid.
-- "Start fresh" sets remembered to false. The requests and their receipts stay.
alter table assistant_requests add column if not exists reply text;
alter table assistant_requests add column if not exists remembered boolean not null default true;
