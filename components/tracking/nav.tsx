"use client";
import { usePathname } from "next/navigation";
export function TrackingNav() {
  const path = usePathname();
  return (
    <nav aria-label="Navigation Macy" className="mb-8 flex border-b text-sm">
      {[
        ["/today", "Carnet"],
        ["/dashboard", "Dashboard"],
        ["/settings", "Paramètres"],
      ].map(([href, label]) => (
        <a
          key={href}
          href={href}
          aria-current={path === href ? "page" : undefined}
          className={`min-h-12 flex-1 px-2 py-3 text-center ${path === href ? "border-b-2 border-foreground font-medium" : "text-muted-foreground"}`}
        >
          {label}
        </a>
      ))}
    </nav>
  );
}
