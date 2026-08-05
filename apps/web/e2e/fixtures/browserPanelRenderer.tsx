import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThreadId } from "@omnimind/contracts";
import { createRoot } from "react-dom/client";

import { BrowserPanel } from "../../src/components/BrowserPanel";

const rootElement = document.getElementById("root");
if (!rootElement) throw new Error("BrowserPanel E2E root is missing.");

const threadId = ThreadId.makeUnsafe(
  new URLSearchParams(window.location.search).get("threadId") ?? "thread-browser-panel-e2e",
);
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false },
  },
});

createRoot(rootElement).render(
  <QueryClientProvider client={queryClient}>
    <BrowserPanel mode="sheet" threadId={threadId} onClosePanel={() => {}} />
  </QueryClientProvider>,
);

document.documentElement.dataset.shellReady = "true";
