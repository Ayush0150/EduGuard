import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import App from "./App.jsx";
import { ErrorBoundary } from "./core/components/ErrorBoundary.jsx";
import { ToastContainer } from "./core/utils/toast.jsx";

import "./index.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <App />
        <ToastContainer />
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
