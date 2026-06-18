# Infra Notes

## Supabase model

Current development schema is defined by:

- `docs/ops/rebuild-profiles-organizations.sql`
- `docs/ops/apply-all-table-rls.sql`

The active model separates:

- `auth.users`: authentication only
- `profiles`: artoir user profile
- `organizations`: groups/teams
- `organization_members`: profile membership and role
- `artwork_creators`: artwork to profile authorship

Older helper scripts for `organizations.kind` and `user_orgs` are deprecated and should not be used for new development.

## RLS expectations

- Public visitors can read organizations, exhibitions, artworks, profiles, and visible artwork creator rows.
- Logged-in profiles can create organizations and become the first owner.
- Organization members can manage exhibitions and artworks for that organization.
- Organization owners can manage members and invites.
- Artwork creator rows can only reference profiles that belong to the same organization as the artwork's exhibition.
