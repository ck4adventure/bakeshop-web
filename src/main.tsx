// Main App Rendering
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router';
import './index.css'
import App from './App.tsx'
import LoginPage from './app/login/page.tsx';
import { ProtectedRoute } from '@/components/ProtectedRoute/ProtectedRoute.tsx';
import { AuthProvider } from '@/context/auth';
import BusinessLayout from './app/business/layout.tsx';
import InventoryPage from './app/business/tabs/inventory/page.tsx';
import TodayPage from './app/business/tabs/today/page.tsx';
import BatchesPage from './app/business/tabs/batches/page.tsx';
import SchedulePage from './app/business/tabs/schedule/page.tsx';
import ItemsPage from './app/business/items/page.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<App />} />
          <Route path="/login" element={<LoginPage />} />

          <Route
            path="/:bakerySlug"
            element={
              <ProtectedRoute>
                <BusinessLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="inventory" replace />} />
            <Route path="inventory" element={<InventoryPage />} />
            <Route path="today" element={<TodayPage />} />
            <Route path="batches" element={<BatchesPage />} />
            <Route path="schedule" element={<SchedulePage />} />
            <Route path="items" element={<ItemsPage />} />
            {/* legacy redirect */}
            <Route path="dashboard" element={<Navigate to="inventory" replace />} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
