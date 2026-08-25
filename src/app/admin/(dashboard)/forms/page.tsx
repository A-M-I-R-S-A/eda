import { redirect } from "next/navigation";
import { ROUTES } from "@/lib/config/routes";

/**
 * `/admin/forms` has no content of its own — the tabs are the screen, so it
 * lands on the first channel.
 */
export default function FormsIndexPage() {
  redirect(ROUTES.admin.messages);
}
