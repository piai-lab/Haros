// FILE: _chat.studio.index.tsx
// Purpose: Migrates the donor Studio URL to the canonical route-backed Chat surface.
// Layer: Routing

import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";

import { SplashScreen } from "../components/SplashScreen";

function LegacyStudioRouteRedirect() {
  const navigate = useNavigate();
  useEffect(() => {
    void navigate({ to: "/", search: { surface: "chat" }, replace: true });
  }, [navigate]);
  return <SplashScreen />;
}

export const Route = createFileRoute("/_chat/studio/")({
  component: LegacyStudioRouteRedirect,
});
