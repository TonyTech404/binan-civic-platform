import { Routes, Route, Navigate } from "react-router-dom";
import { PublicLayout } from "./components/Layout";
import { Home } from "./pages/Home";
import { SubmitReport } from "./pages/SubmitReport";
import { TrackReport } from "./pages/TrackReport";
import { Emergency } from "./pages/Emergency";
import { AdminLogin } from "./pages/admin/Login";
import { AdminLayout } from "./pages/admin/AdminLayout";
import { Dashboard } from "./pages/admin/Dashboard";
import { ReportDetail } from "./pages/admin/ReportDetail";
import { NotFound } from "./pages/NotFound";

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/report" element={<SubmitReport />} />
        <Route path="/track" element={<TrackReport />} />
        <Route path="/track/:ref" element={<TrackReport />} />
        <Route path="/emergency" element={<Emergency />} />
      </Route>

      <Route path="/admin/login" element={<AdminLogin />} />
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Dashboard />} />
        <Route path="reports/:id" element={<ReportDetail />} />
      </Route>

      <Route path="/404" element={<NotFound />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
