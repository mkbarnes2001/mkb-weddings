import React from "react";
import ReactDOM from "react-dom/client";
import { HelmetProvider } from "react-helmet-async";
import WedPlannedApp from "./WedPlannedApp";
import "./wedplanned.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("WedPlanned root element not found");
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <HelmetProvider>
      <WedPlannedApp />
    </HelmetProvider>
  </React.StrictMode>,
);
