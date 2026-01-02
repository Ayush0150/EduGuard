import ProtectedRoute from "./ProtectedRoute";

export default function AdminProtectedRoute() {
  return <ProtectedRoute requiredRoles={["ADMIN", "SUPER_ADMIN"]} />;
}
