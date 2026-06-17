import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.zefast.app",
  appName: "Zefast",
  webDir: "out",
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      serverClientId: "571907882935-chc25lb4d2drev2aog1l581ms2g2tnag.apps.googleusercontent.com",
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
