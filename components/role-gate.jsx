"use client";

import * as React from "react";
import { usePathname, useRouter } from "next/navigation";

export function RoleGate({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const isClient = React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );

  const hasRole = isClient ? Boolean(window.localStorage.getItem("salty_role")) : false;
  const hasPhoneNumber = isClient
    ? Boolean(window.localStorage.getItem("salty_phone_number"))
    : false;
  const onboardingComplete = hasRole && hasPhoneNumber;

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
