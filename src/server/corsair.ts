import { createCorsair } from "corsair";
import { gmail } from "@corsair-dev/gmail";
import { googlecalendar } from "@corsair-dev/googlecalendar";
import { connections } from "./db";

export const corsair = createCorsair({
  plugins: [gmail(), googlecalendar()],
  database: connections,
  kek: process.env.CORSAIR_KEK!,
  multiTenancy: true
//   hub: {
//     projectApiKey: process.env.CORSAIR_API_KEY!,
//     signingSecret: process.env.CORSAIR_SIGNING_SECRET!,
//   },
});
