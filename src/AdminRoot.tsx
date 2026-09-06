import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminApp } from "./admin/app/AdminApp";
import { ProfessionalAuthProvider } from "./admin/auth/ProfessionalAuth";
import { OnlineBooking } from "./components/OnlineBooking";

export function AdminRoot() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/book/:slug" element={<OnlineBooking />} />
        <Route
          path="*"
          element={
            <ProfessionalAuthProvider>
              <Routes>
                <Route path="/admin/*" element={<AdminApp />} />
                <Route path="/" element={<Navigate to="/admin" replace />} />
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </ProfessionalAuthProvider>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
