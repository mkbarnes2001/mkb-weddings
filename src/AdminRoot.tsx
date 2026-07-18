import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AdminApp } from "./admin/app/AdminApp";

export function AdminRoot() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="/" element={<Navigate to="/admin" replace />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
