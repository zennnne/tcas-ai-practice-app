-- dedup table สำหรับ Omise webhook events (at-least-once delivery → exactly-once processing)
create table processed_webhook_events (
  event_id    text        primary key,
  event_key   text        not null,
  processed_at timestamptz not null default now()
);

-- service_role bypasses RLS แต่ Postgres ยังต้องมี table grant แยกเสมอ
grant select, insert, update, delete on table processed_webhook_events to service_role;
