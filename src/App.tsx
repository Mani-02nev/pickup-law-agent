import React from 'react';
import { createBrowserRouter, RouterProvider, Navigate } from 'react-router-dom';
import { Landing } from './pages/Landing';
import { Auth } from './pages/Auth';
import { AgentApp } from './pages/AgentApp';

const router = createBrowserRouter([
  { path: "/", element: <Landing /> },
  { path: "/auth", element: <Auth /> },
  { path: "/app", element: <AgentApp /> },
  { path: "*", element: <Navigate to="/" replace /> }
], {
  future: {
    v7_startTransition: true,
    v7_relativeSplatPath: true,
    v7_fetcherPersist: true,
    v7_normalizeFormMethod: true,
    v7_partialHydration: true,
    v7_skipActionErrorRevalidation: true
  }
} as any);

const App: React.FC = () => {
  return <RouterProvider router={router} future={{ v7_startTransition: true } as any} />;
};

export default App;
