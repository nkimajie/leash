-- Signing in to Leash is connecting PayPal: PayPal tells us your name, and Leash greets you with it.
alter table wallets add column if not exists payer_name text;
