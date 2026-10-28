-- WASSLHA
-- create_master_order: find pgcrypto
--
-- create_master_order calls gen_random_bytes() (pgcrypto), but pgcrypto is installed in the "extensions" schema and
-- these functions only had search_path=public, so every order failed with
-- "function gen_random_bytes(integer) does not exist". Bodies are unchanged; only the search_path gains "extensions".

begin;

alter function public.create_master_order(uuid, uuid, text, text, text, jsonb, integer, integer)
  set search_path to 'public', 'extensions';

alter function public.create_master_order(uuid, uuid, text, text, text, jsonb, integer, integer, integer, integer)
  set search_path to 'public', 'extensions';

commit;
