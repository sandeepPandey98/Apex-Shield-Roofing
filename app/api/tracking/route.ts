import { adminList } from "@/lib/admin-data";
export const GET = (req: Request) => adminList(req, "tracking");
