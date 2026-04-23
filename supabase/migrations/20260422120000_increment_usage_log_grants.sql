-- Allow session-scoped Supabase clients (authenticated JWT) to call the RPC.
-- Without EXECUTE, some projects see RPC as "missing" from the API schema.
grant execute on function public.increment_usage_log(uuid, date, integer) to authenticated;
grant execute on function public.increment_usage_log(uuid, date, integer) to service_role;
