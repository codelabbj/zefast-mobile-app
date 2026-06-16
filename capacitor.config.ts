import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.zefast.app",
  appName: "Zefast",
  webDir: "out",
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "571907882935-cui1dgm3emj9grpqh255t3a19enkoe38.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    CapacitorUpdater: {
      autoUpdate: false,
    },
  },
  server: {
    url: "https://zefast-mobile-app.vercel.app",
    cleartext: false,
  },
}

export default config
