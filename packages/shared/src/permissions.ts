/**
 * Admin roles and what each one may do: the single source of truth.
 *
 * The API enforces these on every request (see apps/api/src/auth). The
 * website reads the same map only to decide what to SHOW; hiding a button is
 * never what keeps an action safe.
 */
export const ADMIN_ROLES = ['ADMIN', 'OPERATOR'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const PERMISSIONS = [
  'shipments:read',
  'shipments:write',
  /** Permanently delete (archived) shipments. Administrators only. */
  'shipments:delete',
  'support:read',
  'support:write',
  /** Permanently delete (closed) support requests. Administrators only. */
  'support:delete',
  'admins:read',
  'admins:manage',
  'audit:read',
] as const;
export type Permission = (typeof PERMISSIONS)[number];

export const ROLE_PERMISSIONS: Record<AdminRole, readonly Permission[]> = {
  /** Everything, including staff accounts and the audit log. */
  ADMIN: PERMISSIONS,
  /** Day-to-day operations: shipments and customer support. */
  OPERATOR: ['shipments:read', 'shipments:write', 'support:read', 'support:write'],
};

export const ROLE_LABELS: Record<AdminRole, string> = {
  ADMIN: 'Administrator',
  OPERATOR: 'Operator',
};

export function hasPermission(role: AdminRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].includes(permission);
}

/** Shape of the signed-in admin as the API returns it. Never includes the password hash. */
export interface AuthenticatedAdmin {
  id: string;
  name: string;
  email: string;
  role: AdminRole;
  permissions: Permission[];
}

export interface AuthSessionInfo {
  admin: AuthenticatedAdmin;
  /** Send back in the X-CSRF-Token header on every POST/PUT/PATCH/DELETE. */
  csrfToken: string;
  session: {
    /** ISO 8601. The session ends at this time no matter what. */
    expiresAt: string;
    /** Seconds of inactivity after which the session ends. */
    idleTimeoutSeconds: number;
  };
}
