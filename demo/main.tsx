import { createRoot } from "react-dom/client";
import { DemoApp } from "./app";
import "./demo.css";
import { notify } from "./notices";
import { preloadDownloads } from "./shims/api-client";

// Inside the Claude viewer the print dialog cannot open; explain instead of failing silently.
if (window.top !== window.self) {
  window.print = () =>
    notify("A impressão não abre dentro do visualizador do Claude. Use a exportação em Excel ou CSV, ou abra o arquivo HTML no navegador.");
}
void preloadDownloads();

createRoot(document.getElementById("root")!).render(<DemoApp />);
