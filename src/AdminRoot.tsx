import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminApp } from "./admin/app/AdminApp";
import { ProfessionalAuthProvider } from "./admin/auth/ProfessionalAuth";

export function AdminRoot() {
  return (
    <BrowserRouter>
      <ProfessionalAuthProvider>
        <Routes>
          <Route path="/admin/*" element={<AdminApp />} />
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Routes>
      </ProfessionalAuthProvider>
    </BrowserRouter>
  );
}
