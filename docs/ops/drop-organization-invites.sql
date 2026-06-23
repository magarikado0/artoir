-- Remove the old invite-URL workflow.
-- Safe to re-run after the app has moved to owner-managed ID search.

drop table if exists public.organization_invites cascade;
