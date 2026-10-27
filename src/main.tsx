import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
// Side-effect import: defines window.DecoNoir. Imported here rather than in a
// <script> tag so it goes through the bundler and ships inside the packaged
// app instead of being a file path that has to survive packaging.
import "./styles/deco-noir.js";
// The Forge look (11 Oct 2026) — loaded last so it wins over index.css and
// Deco Noir. Sora is bundled so the packaged app needs no internet for type.
import "@fontsource/sora/300.css";
import "@fontsource/sora/400.css";
import "@fontsource/sora/500.css";
import "@fontsource/sora/600.css";
import "./styles/forge.css";
import "./styles/lines.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
