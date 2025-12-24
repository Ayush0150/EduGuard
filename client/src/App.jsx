import { Navigate, Route, Routes } from "react-router-dom";
import AdminLoginPage from "./features/auth/pages/AdminLoginPage.jsx";
import ForgotPasswordPage from "./features/auth/pages/ForgotPasswordPage.jsx";
import LoginPage from "./features/auth/pages/LoginPage.jsx";
import AdminDashboard from "./features/dashboard/pages/AdminDashboard.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/login/admin" element={<AdminLoginPage />} />
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
