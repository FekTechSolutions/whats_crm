-- Execute this in the Supabase SQL Editor after schema.sql.
ALTER TABLE public.customers
  ADD CONSTRAINT customers_whatsapp_key UNIQUE (whatsapp);

ALTER TABLE public.messages
  ADD CONSTRAINT messages_wa_message_id_key UNIQUE (wa_message_id);

CREATE OR REPLACE FUNCTION public.ingest_whatsapp_message(
  p_whatsapp text,
  p_name text,
  p_wa_message_id text,
  p_type public.message_type,
  p_content text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_customer_id uuid;
  v_conversation_id uuid;
  v_message_id uuid;
BEGIN
  INSERT INTO public.customers (name, whatsapp, status)
  VALUES (NULLIF(trim(p_name), ''), p_whatsapp, 'lead')
  ON CONFLICT (whatsapp) DO UPDATE
    SET name = COALESCE(NULLIF(EXCLUDED.name, ''), public.customers.name)
  RETURNING id INTO v_customer_id;

  SELECT id INTO v_conversation_id
  FROM public.conversations
  WHERE customer_id = v_customer_id AND status <> 'finalizado'
  ORDER BY updated_at DESC
  LIMIT 1;

  IF v_conversation_id IS NULL THEN
    INSERT INTO public.conversations (customer_id, status, last_message_at)
    VALUES (v_customer_id, 'novo', now())
    RETURNING id INTO v_conversation_id;
  END IF;

  INSERT INTO public.messages (conversation_id, direction, type, content, wa_message_id, status)
  VALUES (v_conversation_id, 'entrada', p_type, p_content, p_wa_message_id, 'received')
  ON CONFLICT (wa_message_id) DO NOTHING
  RETURNING id INTO v_message_id;

  IF v_message_id IS NOT NULL THEN
    UPDATE public.conversations
    SET last_message_at = now(), last_message_preview = p_content, unread_count = unread_count + 1
    WHERE id = v_conversation_id;
  END IF;

  RETURN v_conversation_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.ingest_whatsapp_message(text, text, text, public.message_type, text) TO service_role;
