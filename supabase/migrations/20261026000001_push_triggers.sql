-- ============================================================================
-- Push notifications · triggers de mensajes y notas
-- Ejecutar en el SQL Editor de Supabase DESPUÉS de la migración de la tabla.
--
-- Antes de correr esto, guardá el secreto en Vault (una sola vez):
--
--   select vault.create_secret(
--     '<TU_PUSH_SEND_SECRET>',
--     'push_send_secret',
--     'Secreto compartido con la Edge Function send-push'
--   );
--
-- El valor debe ser EXACTAMENTE el mismo que PUSH_SEND_SECRET en
-- supabase/.env.push.local (secreto de la Edge Function).
-- ============================================================================

-- Extensión de red para llamar a la Edge Function desde Postgres.
create extension if not exists pg_net;

create or replace function public.push_notify_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_url constant text :=
    'https://nkaxeqdcprkvbxrynujw.supabase.co/functions/v1/send-push';
  v_body jsonb;
begin
  select s.decrypted_secret
    into v_secret
  from vault.decrypted_secrets s
  where s.name = 'push_send_secret'
  limit 1;

  v_body := jsonb_build_object(
    'type', tg_op,
    'table', tg_table_name,
    'schema', tg_table_schema,
    'record', to_jsonb(new)
  );

  perform net.http_post(
    url := v_url,
    body := v_body,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-push-secret', coalesce(v_secret, '')
    ),
    timeout_milliseconds := 5000
  );

  return new;
end;
$$;

-- Mensajes del chat -----------------------------------------------------------
drop trigger if exists push_notify_messages on public.messages;
create trigger push_notify_messages
  after insert on public.messages
  for each row
  execute function public.push_notify_webhook();

-- Notas de amor ----------------------------------------------------------------
drop trigger if exists push_notify_love_notes on public.love_notes;
create trigger push_notify_love_notes
  after insert on public.love_notes
  for each row
  execute function public.push_notify_webhook();
