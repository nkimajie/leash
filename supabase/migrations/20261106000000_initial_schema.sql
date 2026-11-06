-- Leash database schema (Supabase / Postgres).
-- One demo user, no login. The browser may only READ; every write goes through
-- the Next.js API using the service-role key, which never reaches the browser.

create extension if not exists "pgcrypto";

-- Your spending rules (the leash). One row per user.
create table spending_rules (
  user_id     text primary key default 'demo',
  rules       jsonb not null,
  updated_at  timestamptz not null default now()
);

-- Your saved PayPal payment method (PayPal Vault), so the assistant can pay without a popup.
create table wallets (
  id               uuid primary key default gen_random_uuid(),
  user_id          text not null default 'demo',
  paypal_vault_id  text not null,
  payer_email      text,
  created_at       timestamptz not null default now()
);

-- People the assistant may send money to.
create table payees (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default 'demo',
  name        text not null,
  email       text,
  note        text,
  trusted     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- What your digital twin knows about you.
create table preferences (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   text not null default 'demo',
  sentiment                 text not null check (sentiment in ('likes', 'avoids')),
  statement                 text not null,
  category                  text,
  merchant                  text,
  product_id                text,
  price_at_least            numeric(12, 2),
  source                    text not null check (source in ('you', 'learned')),
  learned_from_decision_id  uuid,
  created_at                timestamptz not null default now()
);

-- Each message you send the assistant.
create table assistant_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null default 'demo',
  prompt      text not null,
  budget      numeric(12, 2) not null,
  status      text not null check (status in ('working', 'finished', 'failed')),
  created_at  timestamptz not null default now()
);

-- Every purchase or payment the assistant attempted, and what happened. The control room grid.
create table decisions (
  id                       uuid primary key default gen_random_uuid(),
  request_id               uuid references assistant_requests (id),
  kind                     text not null check (kind in ('purchase', 'payment')),
  title                    text not null,
  counterparty             text not null,
  category                 text,
  amount                   numeric(12, 2) not null,
  currency                 text not null default 'USD',
  outcome                  text not null check (outcome in
                             ('auto_approved', 'held', 'approved', 'denied', 'blocked', 'refunded', 'failed')),
  rule_hit                 text not null,
  rule_explanation         text not null,
  ai_reasoning             text not null,
  product                  jsonb,
  payee                    jsonb,
  paypal_order_id          text,
  paypal_authorization_id  text,
  paypal_capture_id        text,
  paypal_status            text,
  paypal_debug_id          text,
  created_at               timestamptz not null default now(),
  updated_at               timestamptz not null default now()
);

create index decisions_created_at_idx on decisions (created_at desc);
create index decisions_request_id_idx on decisions (request_id);

-- Row-level security: the browser (anon key) can read, never write.
alter table spending_rules      enable row level security;
alter table wallets             enable row level security;
alter table payees              enable row level security;
alter table preferences         enable row level security;
alter table assistant_requests  enable row level security;
alter table decisions           enable row level security;

create policy "read decisions"    on decisions    for select to anon using (true);
create policy "read payees"       on payees       for select to anon using (true);
create policy "read preferences"  on preferences  for select to anon using (true);
-- wallets, rules and requests are read by the server only.

-- Live updates for the control room grid.
alter publication supabase_realtime add table decisions;
