import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AuthProvider } from "./contexts/AuthContext";
import { HelmetProvider } from "react-helmet-async";
import { SystemInfoProvider } from "./contexts/SystemInfoContext";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <SystemInfoProvider>
    <AuthProvider>
      <App />
    </AuthProvider>
    </SystemInfoProvider>
  </HelmetProvider>
);
