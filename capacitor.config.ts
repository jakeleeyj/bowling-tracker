import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.jakelee.spareme",
  appName: "Spare Me",
  webDir: "public",
  server: {
    url: "https://bowling-tracker-omega.vercel.app",
    allowNavigation: ["bowling-tracker-omega.vercel.app", "*.supabase.co"],
  },
  android: {
    allowMixedContent: false,
  },
  ios: {
    limitsNavigationsToAppBoundDomains: true,
  },
};

export default config;
