import type { CapacitorConfig } from "@capacitor/cli"

const config: CapacitorConfig = {
  appId: "com.zefast.app",
  appName: "Zefast",
  webDir: "out",
  //bundledWebRuntime: false,
  // plugins: {
  //   CapacitorUpdater: {
  //     autoUpdate: false
  //   }
  // },
  // plugins: {
  //   CapacitorUpdater: {
  //     autoUpdate: true,
  //     server: "https://turnaicash-mobile-app-1-p3ef20nbk-codelabbjgmailcoms-projects.vercel.app",
  //   }
  // },
  server: {
    // androidScheme: "https",
    url: "https://zefast-mobile-app.vercel.app",
    cleartext: false
  },
}

export default config
