import { MarcaOnlyGuard } from "@/components/admin/MarcaOnlyGuard";
import { ModeloFormPageClient } from "../ModeloFormPageClient";

export default function NovoModeloPage() {
  return <MarcaOnlyGuard><ModeloFormPageClient /></MarcaOnlyGuard>;
}
