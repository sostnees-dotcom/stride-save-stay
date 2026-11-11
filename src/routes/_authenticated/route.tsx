import { createFileRoute, redirect, Outlet } from "@tanstack/react-router";

import { supabase } from "@/integrations/supabase/client";
import { AppNavigation } from "@/components/app-navigation";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
  },
  component: AuthenticatedShell,
});

function AuthenticatedShell() {
  return (
    <div className="pb-[calc(6rem+env(safe-area-inset-bottom))] pt-[env(safe-area-inset-top)] md:pb-0">
      <Outlet />
      <AppNavigation />
    </div>
  );
}
});
