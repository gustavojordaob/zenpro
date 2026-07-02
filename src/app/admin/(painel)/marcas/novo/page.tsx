import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { MarcaFormPageClient } from "../MarcaFormPageClient";

export default function NovaMarcaPage() {
  return <MarcaOnlyGuard><MarcaFormPageClient /></MarcaOnlyGuard>;
}
