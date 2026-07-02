import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { ModelosAdminPageClient } from "./ModelosAdminPageClient";

export default function ModelosPage() {
  return <MarcaOnlyGuard><ModelosAdminPageClient /></MarcaOnlyGuard>;
}
