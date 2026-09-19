import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { getStoredFamily, getStoredMode } from "./hooks/useTheme";

// Apply persisted family and mode before first render (FOUC guard complements index.html inline script)
document.documentElement.dataset.theme = getStoredFamily();
document.documentElement.dataset.mode = getStoredMode();

// import.meta.env.BASE_URL mirrors vite `base` (always trailing slash).
// Strip it for the router, whose basename wants no trailing slash.
const basename =
  import.meta.env.BASE_URL === "/" ? undefined : import.meta.env.BASE_URL.replace(/\/$/, "");

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);