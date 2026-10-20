import React, { lazy, Suspense } from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import { CoachProvider } from "./context/CoachContext.jsx";   // ⬅️ add
import MainLayout from "./layout/MainLayout";
import Auth from "./pages/Auth";
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Workout = lazy(() => import("./pages/Workout"));
const Meals = lazy(() => import("./pages/Meals"));
const Trading = lazy(() => import("./pages/Trading"));
const Coach = lazy(() => import("./pages/Coach"));
import ProtectedRoute from "./components/ProtectedRoute";
import { registerSW } from "virtual:pwa-register";
import "./index.css";

registerSW({
  onNeedRefresh() {},
  onOfflineReady() {},
});

const router = createBrowserRouter([
  {
    path: "/",
    element: (
      <ProtectedRoute>
        <MainLayout />
      </ProtectedRoute>
    ),
    children: [
      { path: "/", element: <Suspense fallback={<div className="dashboard-loading" role="status">Loading your workspace...</div>}><Dashboard /></Suspense> },
      { path: "/workout", element: <Suspense fallback={<div className="dashboard-loading" role="status">Loading your workspace...</div>}><Workout /></Suspense> },
      { path: "/meals", element: <Suspense fallback={<div className="dashboard-loading" role="status">Loading your workspace...</div>}><Meals /></Suspense> },
      { path: "/trading", element: <Suspense fallback={<div className="dashboard-loading" role="status">Loading your workspace...</div>}><Trading /></Suspense> },
      { path: "/coach", element: <Suspense fallback={<div className="dashboard-loading" role="status">Loading your workspace...</div>}><Coach /></Suspense> },
    ],
  },
  { path: "/auth", element: <Auth /> },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    {/* ⬇️ Provide coach context to the whole app */}
    <CoachProvider>
      <RouterProvider router={router} />
    </CoachProvider>
  </React.StrictMode>
);
