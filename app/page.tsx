import { redirect } from "next/navigation";

// The admin has no landing page: send "/" to the dashboard.
// Once auth exists, signed-out visitors will be sent to /login instead.
export default function Home() {
  redirect("/dashboard");
}
