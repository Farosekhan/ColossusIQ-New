import type { MetadataRoute } from "next";
import { ROLES } from "@/lib/auth/roles";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", "/login", ...ROLES.map((r) => `/${r}`)] },
  };
}
