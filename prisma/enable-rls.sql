-- Defensa adicional para el esquema expuesto por Supabase.
-- El usuario PostgreSQL usado por Prisma debe tener BYPASSRLS, como indica
-- la guía oficial de Supabase para Prisma. La aplicación no consulta estas
-- tablas directamente desde el navegador.

alter table public.workshops enable row level security;
alter table public.profiles enable row level security;
alter table public.workshop_members enable row level security;
alter table public.customers enable row level security;
alter table public.vehicles enable row level security;
alter table public.service_orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.expenses enable row level security;

revoke all on table public.workshops from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.workshop_members from anon, authenticated;
revoke all on table public.customers from anon, authenticated;
revoke all on table public.vehicles from anon, authenticated;
revoke all on table public.service_orders from anon, authenticated;
revoke all on table public.order_items from anon, authenticated;
revoke all on table public.payments from anon, authenticated;
revoke all on table public.expenses from anon, authenticated;
