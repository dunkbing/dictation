import { hc } from "hono/client";
import type { AppType } from "@/api";

export const apiClient = hc<AppType>(
  `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api`,
  {
    init: {
      credentials: "include",
    },
  },
);
