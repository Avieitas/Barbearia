-- Permite excluir agendamentos somente pelo proprietário autenticado.
begin;
grant delete on table public.appointments to authenticated;
drop policy if exists "Owner can delete appointments" on public.appointments;
create policy "Owner can delete appointments"
  on public.appointments for delete
  to authenticated
  using ((select public.is_owner()));
commit;
