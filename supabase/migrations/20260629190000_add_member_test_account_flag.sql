alter table public.members
add column if not exists is_test_account boolean not null default false;

comment on column public.members.is_test_account
is 'When true, QR check-ins return success without writing redemptions, stamp visits, rewards, or sheet logs.';
