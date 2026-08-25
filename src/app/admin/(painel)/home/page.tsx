import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { HomeMidiaAdminPageClient } from "./HomeMidiaAdminPageClient";

export default function AdminHomeMidiaPage() {
  return (
    <MarcaOnlyGuard>
      <HomeMidiaAdminPageClient />
    </MarcaOnlyGuard>
  );
}
