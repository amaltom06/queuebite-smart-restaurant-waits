
-- Set search_path on assign_token_number and lock down execute on both helpers
create or replace function public.assign_token_number()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.token_number is null or new.token_number = 0 then
    select coalesce(max(token_number), 0) + 1 into new.token_number
    from public.queue_entries
    where restaurant_id = new.restaurant_id
      and created_at::date = current_date;
  end if;
  return new;
end; $$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
revoke execute on function public.assign_token_number() from public, anon, authenticated;
