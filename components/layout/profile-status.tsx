"use client";

import { useAuthStore } from "@/stores/auth-store";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { IconLink } from "@/components/layout/icon-link";

export function ProfileStatus() {
  const hasMounted = useHasMounted();
  const user = useAuthStore((state) => state.user);
  const isHydrating = useAuthStore((state) => state.isHydrating);
  const href = hasMounted && !isHydrating && user ? "/account" : "/auth";

  return (
    <IconLink href={href} label={hasMounted && user ? "Open profile" : "Login or signup"}>
      <svg aria-hidden="true" className="h-5 w-5" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm7 8a7 7 0 0 0-14 0"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth="1.8"
        />
      </svg>
    </IconLink>
  );
}
