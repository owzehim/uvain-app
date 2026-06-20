alter table public.stamp_card_config
add column if not exists background_color text not null default '#ffffff';
