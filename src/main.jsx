import React from "react";
import ReactDOM from "react-dom/client";
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";

import { CoachProvider } from "./context/CoachContext.jsx";   // ⬅️ add
import MainLayout from "./layout/MainLayout";
import Auth from "./pages/Auth";
import Dashboard from "./pages/Dashboard";
import Workout from "./pages/Workout";
import Meals from "./pages/Meals";
import Trading from "./pages/Trading";
import Coach from "./pages/Coach";
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
      { path: "/", element: <Dashboard /> },
      { path: "/workout", element: <Workout /> },
      { path: "/meals", element: <Meals /> },
      { path: "/trading", element: <Trading /> },
      { path: "/coach", element: <Coach /> },
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
