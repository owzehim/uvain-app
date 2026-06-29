create or replace function public.create_review_prompt_on_redemption()
returns trigger
language plpgsql
security definer
as $$
begin
  insert into public.review_prompts (
    redemption_id,
    user_id,
    store_id,
    prompt_at
  ) values (
    new.id,
    new.user_id,
    new.store_id,
    new.redeemed_at + interval '30 minutes'
  );
  return new;
end;
$$;
