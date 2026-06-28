// Admin access check (pure). The DB enforces admin via the is_admin() RLS helper;
// this mirrors it for server route guards and UI. See docs/PRD-admin.md §6.

export function isAdmin(profile: { role: string } | null | undefined): boolean {
  return profile?.role === 'admin'
}
