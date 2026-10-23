import { redirect } from "next/navigation";
import { isAuthed } from "@/lib/auth";
import Dashboard from "./dashboard";

export const metadata = { title: "Chaves de IA" };
export const dynamic = "force-dynamic";

export default async function AIKeysPage() {
  if (!(await isAuthed())) redirect("/admin/login");
  return <Dashboard />;
}
