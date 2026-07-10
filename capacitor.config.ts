import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jakelee.spareme",
  appName: "Spare Me",
  webDir: "public",
  server: {
    url: "https://spareme.club",
    allowNavigation: ["spareme.club", "*.supabase.co"],
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
