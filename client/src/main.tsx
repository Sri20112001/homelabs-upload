import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { getStoredFamily, getStoredMode } from "./hooks/useTheme";

// Apply persisted family and mode before first render (FOUC guard complements index.html inline script)
document.documentElement.dataset.theme = getStoredFamily();
document.documentElement.dataset.mode = getStoredMode();

createRoot(document.getElementById("root")!).render(<App />);