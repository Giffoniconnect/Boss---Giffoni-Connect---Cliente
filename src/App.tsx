import React, { Suspense } from 'react';
import { createBrowserRouter, createRoutesFromElements, RouterProvider, Route, Outlet, Navigate } from 'react-router-dom';
import AppErrorBoundary from './components/AppErrorBoundary';
import HomeLite from './pages/HomeLite';
import LoginLite from './pages/boss/LoginLite';

const LoaderFallback = () => (
  <div style={{ padding: 40, fontFamily: 'Arial' }}>
    Carregando módulo...
  </div>
);

const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<Suspense fallback={<LoaderFallback />}><Outlet /></Suspense>}>
      <Route path="/" element={<HomeLite />} />
      <Route path="/boss-giffoni-clientes/login" element={<LoginLite />} />
      <Route path="/boss-giffoni-clientes/login-lite" element={<LoginLite />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Route>
  )
);

export default function App() {
  return (
    <AppErrorBoundary>
      <RouterProvider router={router} />
    </AppErrorBoundary>
  );
}
