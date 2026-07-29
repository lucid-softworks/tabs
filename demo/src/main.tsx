import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./app.js";

// eslint-disable-next-line import/no-unassigned-import -- Vite loads the demo stylesheet from this side-effect import.
import "./styles.css";

const root = document.querySelector("#root");

if (!root) {
  throw new Error("Demo root element was not found.");
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
