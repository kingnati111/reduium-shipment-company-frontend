/**
 * Where to go after signing in. Only paths inside the admin area are
 * accepted, so a crafted link like /admin/login?next=https://evil.example
 * can't bounce someone to another site (an "open redirect").
 */
export function safeNextPath(next: string | null): string {
  if (!next) return '/admin';
  if (!/^\/admin(?:[/?#]|$)/.test(next)) return '/admin';
  if (/^\/admin\/login(?:[/?#]|$)/.test(next)) return '/admin';
  if (next.startsWith('//') || next.includes('\\') || /[\r\n\t]/.test(next)) return '/admin';
  return next;
}
