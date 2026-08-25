export const ADMIN_ROLES = ["superadmin"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export interface AuthenticatedUser {
  sub: string;
  email: string;
  name: string;
  role: AdminRole;
}
