-- Acedle, milestone 5: clean up abandoned guests.
--
-- Every visitor who presses Roll becomes an anonymous user. Most never sign
-- in, so once a guest has been inactive for 30 days (no roll in that time),
-- delete the user; their rolls go with them (on delete cascade). A nightly
-- pg_cron job runs it inside the database, so nothing else needs scheduling.

create function public.delete_stale_guests(p_days integer default 30)
returns integer
language sql
security definer
set search_path = ''
as $$
  with deleted as (
    delete from auth.users u
    where u.is_anonymous
      and u.created_at < now() - make_interval(days => p_days)
      and not exists (
        select 1 from public.rolls r
        where r.user_id = u.id and r.day >= current_date - p_days
      )
    returning 1
  )
  select count(*)::integer from deleted;
$$;

revoke execute on function public.delete_stale_guests(integer) from public, anon, authenticated;
grant execute on function public.delete_stale_guests(integer) to service_role;

create extension if not exists pg_cron;

-- 04:23 UTC daily. Scheduling under the same name again replaces the job.
select cron.schedule('acedle-delete-stale-guests', '23 4 * * *', 'select public.delete_stale_guests(30)');
