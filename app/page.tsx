import { redirect } from "next/navigation";

/**
 * Root page — redirects to the dashboard.
 * Middleware handles unauthenticated users → /login.
 */
export default function Home() {
  redirect("/dashboard");
}
