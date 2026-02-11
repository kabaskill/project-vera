"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  Store,
  Tag,
  Users,
  History,
  Bell,
  Link as LinkIcon,
  Plus,
  Link2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/dashboard/products", label: "Products", icon: Package },
  { href: "/dashboard/store-products", label: "Store Products", icon: Store },
  { href: "/dashboard/prices", label: "Prices", icon: Tag },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/user-products", label: "User Products", icon: History },
  { href: "/dashboard/price-alerts", label: "Price Alerts", icon: Bell },
  { href: "/dashboard/url-cache", label: "URL Cache", icon: LinkIcon },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r bg-sidebar">
      <div className="flex h-14 items-center border-b px-4">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold text-lg">
          <Package className="h-5 w-5 text-primary" />
          <span>Vera Admin</span>
        </Link>
      </div>
      
      <div className="flex-1 overflow-auto py-4">
        <nav className="grid gap-1 px-2">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
              >
                <item.icon className="h-4 w-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>

      <Separator />
      
      <div className="p-4 space-y-2">
        <Link href="/dashboard/products/new">
          <Button className="w-full gap-2" size="sm">
            <Plus className="h-4 w-4" />
            Add Product
          </Button>
        </Link>
        <Link href="/dashboard/products/submit">
          <Button className="w-full gap-2" variant="outline" size="sm">
            <Link2 className="h-4 w-4" />
            Submit by URL
          </Button>
        </Link>
      </div>
    </div>
  );
}
