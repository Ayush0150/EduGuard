import ProtectedRoute from "./ProtectedRoute";

/**
 * AdminProtectedRoute
 * -------------------
 * Allows access only to ADMIN and SUPER_ADMIN roles.
 * Used for admin-only pages.
 */
const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"];

export default function AdminProtectedRoute() {
  return <ProtectedRoute requiredRoles={ADMIN_ROLES} />;
}
