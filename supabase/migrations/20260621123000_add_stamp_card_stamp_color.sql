alter table public.stamp_card_config
add column if not exists stamp_color text not null default '#111827';
