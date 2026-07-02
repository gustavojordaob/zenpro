import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { MarcasAdminPageClient } from "./MarcasAdminPageClient";

export default function MarcasPage() {
  return <MarcaOnlyGuard><MarcasAdminPageClient /></MarcaOnlyGuard>;
}
