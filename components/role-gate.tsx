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
  const onboardingComplete = hasRole;

  React.useEffect(() => {
    if (isClient && !onboardingComplete) {
      router.replace(`/login?next=${encodeURIComponent(pathname)}`);
    }
  }, [isClient, onboardingComplete, pathname, router]);

  if (!isClient || !onboardingComplete) {
    return <div className="min-h-screen bg-zinc-50" aria-label="Loading SALTY Marine" />;
  }

  return <>{children}</>;
}
