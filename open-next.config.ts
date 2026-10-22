import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Pages are rendered on demand (they read the database), so no incremental cache is needed.
export default defineCloudflareConfig({});
