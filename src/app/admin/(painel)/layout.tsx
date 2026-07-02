"use client";

import { usePathname } from "next/navigation";
import { AdminRouteGuard } from "@/components/admin/AdminRouteGuard";

export default function AdminPainelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const match = pathname.match(/^\/admin\/lojas\/([^/]+)/);
  const lojaIdRota = match?.[1];

  return (
    <AdminRouteGuard lojaIdRota={lojaIdRota}>{children}</AdminRouteGuard>
  );
}
