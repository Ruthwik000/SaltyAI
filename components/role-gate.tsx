"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

export function RoleGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const hasRole = isClient ? Boolean(window.localStorage.getItem("salty_role")) : false;

  React.useEffect(() => {
    if (isClient && !hasRole) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isClient, hasRole, pathname, router]);

  if (!isClient || !hasRole) {
    return <div className="min-h-screen bg-zinc-50" aria-label="Loading SALTY Marine" />;
  }

  return <>{children}</>;
}
