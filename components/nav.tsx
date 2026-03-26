"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const baseNavItems = [
  { href: "/", label: "분석" },
  { href: "/history", label: "이력" },
] as const;

const adminNavItem = { href: "/admin", label: "관리자" } as const;

export function AppNav({ showAdminLink }: { showAdminLink: boolean }) {
  const pathname = usePathname();
  const navItems = showAdminLink ? [...baseNavItems, adminNavItem] : baseNavItems;

  return (
    <nav className="nav">
      {navItems.map((item) => {
        const isActive = pathname === item.href;

        return (
          <Link key={item.href} href={item.href} className="nav__link" data-active={isActive}>
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
