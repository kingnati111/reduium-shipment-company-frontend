import { Route, Routes } from 'react-router';
import { ButtonLink } from '../../components/ui/Button';
import { AdminHomePage } from '../../pages/admin/AdminHomePage';
import { AdminLoginPage } from '../../pages/admin/AdminLoginPage';
import { AdminTeamPage } from '../../pages/admin/AdminTeamPage';
import { ShipmentDetailPage } from '../../pages/admin/ShipmentDetailPage';
import { EditShipmentPage, NewShipmentPage } from '../../pages/admin/ShipmentFormPages';
import { ShipmentsListPage } from '../../pages/admin/ShipmentsListPage';
import { SupportDetailPage } from '../../pages/admin/SupportDetailPage';
import { SupportListPage } from '../../pages/admin/SupportListPage';
import { AdminLayout } from './AdminLayout';
import { AuthProvider } from './AuthProvider';
import { RequireAdmin, RequirePermission } from './guards';

function AdminNotFound() {
  return (
    <section>
      <h1 className="type-display text-3xl text-ink">Page not found</h1>
      <p className="mt-2 text-ink-600">This admin page doesn&apos;t exist.</p>
      <ButtonLink to="/admin" variant="outline" className="mt-6">
        Back to overview
      </ButtonLink>
    </section>
  );
}

/**
 * The whole admin area (/admin/*). It's loaded as a separate bundle, only
 * when someone opens an admin page, so customers never download it.
 */
export default function AdminApp() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<AdminLoginPage />} />
        <Route element={<RequireAdmin />}>
          <Route element={<AdminLayout />}>
            <Route index element={<AdminHomePage />} />
            <Route path="shipments" element={<ShipmentsListPage />} />
            <Route
              path="shipments/new"
              element={
                <RequirePermission permission="shipments:write">
                  <NewShipmentPage />
                </RequirePermission>
              }
            />
            <Route path="shipments/:id" element={<ShipmentDetailPage />} />
            <Route
              path="shipments/:id/edit"
              element={
                <RequirePermission permission="shipments:write">
                  <EditShipmentPage />
                </RequirePermission>
              }
            />
            <Route
              path="support"
              element={
                <RequirePermission permission="support:read">
                  <SupportListPage />
                </RequirePermission>
              }
            />
            <Route
              path="support/:id"
              element={
                <RequirePermission permission="support:read">
                  <SupportDetailPage />
                </RequirePermission>
              }
            />
            <Route
              path="team"
              element={
                <RequirePermission permission="admins:read">
                  <AdminTeamPage />
                </RequirePermission>
              }
            />
            <Route path="*" element={<AdminNotFound />} />
          </Route>
        </Route>
      </Routes>
    </AuthProvider>
  );
}
