"use client"

import { useState, useEffect } from "react"
import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { ArrowDownCircle, ArrowUpCircle, LogOut, Bell, Gift, ChevronRight, Plus, Minus, User, Moon, Sun, Ticket } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Switch } from "@/components/ui/switch"
import { AuthGuard } from "@/components/auth-guard"
import { getUser, logout } from "@/lib/auth"
import api from "@/lib/api"
import type { Transaction } from "@/lib/types"
import { formatDate } from "@/lib/utils"
import { FloatingMessageButton } from "@/components/FloatingMessageButton"

function DashboardContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const user = getUser()
  const [adImageError, setAdImageError] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: transactions, isLoading } = useQuery({
    queryKey: ["recent-transactions"],
    queryFn: async () => {
      const response = await api.get<{
        count: number
        results: Transaction[]
      }>("/mobcash/transaction-history", {
        params: {
          page: 1,
          page_size: 5,
        },
      })
      return response.data.results
    },
  })

  // Fetch advertisement
  const { data: advertisement, isLoading: loadingAd } = useQuery({
    queryKey: ["advertisement"],
    queryFn: async () => {
      try {
        const response = await api.get("/mobcash/ann")
        return response.data
      } catch (error) {
        return null
      }
    },
  })

  // Fetch settings to check referral_bonus
  const { data: settings } = useQuery<{ referral_bonus: boolean }>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/mobcash/setting")
      return response.data
    },
  })

  const referralBonusEnabled = settings?.referral_bonus === true

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "accept":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-emerald-100 to-emerald-50 dark:from-emerald-900/40 dark:to-emerald-800/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-700 shadow-sm">
            {t("accept")}
          </span>
        )
      case "reject":
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-red-100 to-red-50 dark:from-red-900/40 dark:to-red-800/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700 shadow-sm">
            {t("reject")}
          </span>
        )
      default:
        return (
          <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold bg-gradient-to-r from-amber-100 to-amber-50 dark:from-amber-900/40 dark:to-amber-800/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 shadow-sm">
            {t("pending")}
          </span>
        )
    }
  }

  const getTypeIcon = (type: string) => {
    return type === "deposit" ? (
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 shadow-lg shadow-emerald-500/20 border border-emerald-200/50 dark:border-emerald-700/30">
        <ArrowDownCircle className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />
      </div>
    ) : (
      <div className="flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/10 dark:from-primary/30 dark:to-primary/20 shadow-lg shadow-primary/20 border border-primary/30 dark:border-primary/40">
        <ArrowUpCircle className="h-6 w-6 text-primary dark:text-primary" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Mobile Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-50 safe-area-top shadow-sm">
        <div className="px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img 
                src="/Zefast-logo.png" 
                alt="Zefast Logo" 
                className="h-18 w-auto object-contain"
              />
              <div>
                <p className="text-sm text-slate-600 dark:text-slate-400 font-medium">
                  {t("hello")}, {user?.first_name || "User"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 hover:from-primary/20 hover:to-primary/10 dark:hover:from-primary/30 dark:hover:to-primary/20 border border-primary/20 dark:border-primary/30 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center"
                onClick={() => router.push("/notifications")}
              >
                <Bell className="h-5 w-5 text-primary dark:text-primary" />
              </button>
              <button
                className="h-11 w-11 rounded-2xl bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950/30 dark:to-pink-950/30 hover:from-purple-100 hover:to-pink-100 dark:hover:from-purple-950/50 dark:hover:to-pink-950/50 border border-purple-200/50 dark:border-purple-800/30 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center"
                onClick={() => router.push("/coupon")}
              >
                <Ticket className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="h-11 w-11 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 hover:from-primary/20 hover:to-primary/10 dark:hover:from-primary/30 dark:hover:to-primary/20 border border-primary/20 dark:border-primary/30 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center"
                  >
                    <User className="h-5 w-5 text-primary dark:text-primary" />
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">{user?.first_name} {user?.last_name}</p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="flex items-center justify-between cursor-pointer"
                    onSelect={(e) => {
                      e.preventDefault()
                      setTheme(theme === "dark" ? "light" : "dark")
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {mounted && theme === "dark" ? (
                        <Moon className="h-4 w-4" />
                      ) : (
                        <Sun className="h-4 w-4" />
                      )}
                      <span>{mounted && theme === "dark" ? "Mode sombre" : "Mode clair"}</span>
                    </div>
                    {mounted && (
                      <Switch
                        checked={theme === "dark"}
                        onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
                      />
                    )}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer"
                    onSelect={() => router.push("/profile")}
                  >
                    <User className="h-4 w-4 mr-2" />
                    <span>Mon Profil</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    className="cursor-pointer"
                    onSelect={logout}
                  >
                    <LogOut className="h-4 w-4 mr-2" />
                    <span>Déconnexion</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 space-y-5 pb-8 safe-area-bottom">
        {/* Bonus Card */}
        {user && user.bonus_available > 0 && (
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white shadow-2xl shadow-amber-500/30">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
            <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
            <div className="relative p-6">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-semibold opacity-95">Bonus disponible</p>
                  <p className="text-4xl font-black tracking-tight">{user.bonus_available.toLocaleString()} FCFA</p>
                  <p className="text-xs opacity-90 font-medium">Utilisable pour vos transactions</p>
                </div>
                <div className="relative">
                  <div className="absolute inset-0 bg-white/30 rounded-2xl blur-xl"></div>
                  <div className="relative w-16 h-16 rounded-2xl bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/30">
                    <Gift className="h-8 w-8" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40 active:scale-[0.97] transition-all duration-300 touch-manipulation"
            onClick={() => router.push("/deposit")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute -top-8 -right-8 w-20 h-20 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                <Plus className="h-6 w-6" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-base font-bold">{t("deposit")}</p>
                <p className="text-xs opacity-90 mt-0.5 font-medium">Dépôt</p>
              </div>
            </div>
          </button>

          <button
            className="group relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary to-accent dark:from-primary dark:to-accent text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40 active:scale-[0.97] transition-all duration-300 touch-manipulation"
            onClick={() => router.push("/withdraw")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute -top-8 -right-8 w-20 h-20 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                <Minus className="h-6 w-6" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-base font-bold">{t("withdraw")}</p>
                <p className="text-xs opacity-90 mt-0.5 font-medium">Retrait</p>
              </div>
            </div>
          </button>
        </div>

        {/* Advertisement Section */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/10 via-accent/10 to-primary/5 dark:from-primary/20 dark:via-accent/20 dark:to-primary/10 border border-primary/20 dark:border-primary/30 shadow-lg shadow-primary/10 dark:shadow-primary/20">
          <div className="relative w-full h-48 flex items-center justify-center overflow-hidden">
            {loadingAd ? (
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-white border-r-transparent"></div>
              </div>
            ) : advertisement && (advertisement.image || advertisement.url || (typeof advertisement === 'string' && advertisement)) ? (
              <img
                src={advertisement.image || advertisement.url || advertisement}
                alt="Advertisement"
                className="w-full h-full object-cover"
                onError={() => setAdImageError(true)}
              />
            ) : !adImageError ? (
              <img
                src="/placeholder.jpg"
                alt="Advertisement"
                className="w-full h-full object-cover"
                onError={() => setAdImageError(true)}
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary via-accent to-primary flex items-center justify-center">
                <p className="text-white font-bold text-lg">Advertisement</p>
              </div>
            )}
          </div>
        </div>

        {/* Bonus Button */}
        {referralBonusEnabled && (
          <button
            className="w-full group relative overflow-hidden rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 dark:from-amber-600 dark:to-orange-700 text-white shadow-lg shadow-amber-500/30 hover:shadow-xl hover:shadow-amber-500/40 active:scale-[0.97] transition-all duration-300 touch-manipulation"
            onClick={() => router.push("/bonus")}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <div className="absolute -top-8 -right-8 w-20 h-20 bg-white/20 rounded-full blur-xl group-hover:scale-150 transition-transform duration-500"></div>
            <div className="relative p-4 flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/25 backdrop-blur-sm flex items-center justify-center border border-white/30 shadow-lg">
                <Gift className="h-6 w-6" />
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-base font-bold">Bonus</p>
                <p className="text-xs opacity-90 mt-0.5 font-medium">Voir mes bonus</p>
              </div>
            </div>
          </button>
        )}

        {/* Recent Transactions */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("recentTransactions")}</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  Vos 5 dernières transactions
                </p>
              </div>
              <button
                className="h-8 px-3 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/80 active:scale-95 transition-all duration-200 text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5 shadow-sm"
                onClick={() => router.push("/transactions")}
              >
                {t("viewAll")}
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
          <div>
            {isLoading ? (
              <div className="text-center py-16 text-slate-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-primary border-r-transparent mb-3"></div>
                <p className="text-sm font-semibold">{t("loading")}</p>
              </div>
            ) : !transactions || transactions.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-inner">
                  <ArrowDownCircle className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-semibold">{t("noData")}</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {transactions.map((transaction) => (
                  <button
                    key={transaction.id}
                    className="w-full flex items-center gap-4 px-5 py-4 active:bg-slate-50 dark:active:bg-slate-800/50 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-all duration-200 touch-manipulation text-left group"
                    onClick={() => router.push("/transactions")}
                  >
                    <div className="flex-shrink-0">
                      {getTypeIcon(transaction.type_trans)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-3 mb-1.5">
                        <p className="font-bold text-[15px] text-slate-900 dark:text-slate-100 truncate">
                          {transaction.type_trans === "deposit" ? t("deposit") : t("withdraw")}
                        </p>
                        <p className={`font-black text-[15px] shrink-0 ${
                          transaction.type_trans === "deposit" 
                            ? "text-emerald-600 dark:text-emerald-400" 
                            : "text-primary dark:text-primary"
                        }`}>
                          {transaction.type_trans === "deposit" ? "+" : "-"}{transaction.amount.toLocaleString()} FCFA
                        </p>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatDate(transaction.created_at)}</p>
                        {getStatusBadge(transaction.status)}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-slate-400 dark:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Floating Message Button */}
      <FloatingMessageButton 
        whatsappNumber="+22900000000"
        telegramUsername="your_telegram_username"
      />
    </div>
  )
}

export default function DashboardPage() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  )
}
