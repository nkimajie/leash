-- Outside AI agents can shop and pay through your rules with the Leash API (/api/v1).
-- Their requests are saved with the source 'agent'.

alter table assistant_requests drop constraint assistant_requests_source_check;
alter table assistant_requests
  add constraint assistant_requests_source_check check (source in ('you', 'restock', 'agent'));
