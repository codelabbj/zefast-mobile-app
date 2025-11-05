"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Gift, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { AuthGuard } from "@/components/auth-guard"
import { getUser } from "@/lib/auth"
import api from "@/lib/api"
import type { Bonus, PaginatedResponse } from "@/lib/types"
import { formatDate } from "@/lib/utils"

function BonusContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = getUser()

  const { data, isLoading } = useQuery({
    queryKey: ["bonus"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Bonus>>("/mobcash/bonus")
      return response.data
    },
  })

  const totalBonus = data?.results.reduce((sum, bonus) => sum + Number(bonus.amount), 0) || 0

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-50 safe-area-top shadow-sm">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              className="h-11 w-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-700 dark:hover:to-slate-600 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent">{t("bonus")}</h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 space-y-5 pb-8 safe-area-bottom">
        {/* Current Bonus Card */}
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 text-white shadow-2xl shadow-amber-500/30">
          <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent"></div>
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-20 -left-20 w-48 h-48 bg-white/5 rounded-full blur-2xl"></div>
          <div className="relative p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-2">
                <p className="text-sm font-semibold opacity-95">Bonus disponible</p>
                <p className="text-4xl font-black tracking-tight">{user?.bonus_available || 0} FCFA</p>
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

        {/* Total Earned Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold uppercase tracking-wide">Total gagné</p>
                <p className="text-3xl font-black text-slate-900 dark:text-slate-100">{totalBonus.toLocaleString()} FCFA</p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-100 to-emerald-200 dark:from-emerald-900/40 dark:to-emerald-800/40 shadow-lg shadow-emerald-500/20 border border-emerald-200/50 dark:border-emerald-700/30 flex items-center justify-center">
                <TrendingUp className="h-8 w-8 text-emerald-600 dark:text-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Bonus History */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Historique des bonus</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                {data?.count || 0} bonus reçu{(data?.count || 0) > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div>
            {isLoading ? (
              <div className="text-center py-16 text-slate-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-indigo-500 border-r-transparent mb-3"></div>
                <p className="text-sm font-semibold">{t("loading")}</p>
              </div>
            ) : !data?.results || data.results.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-inner">
                  <Gift className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-semibold">Aucun bonus pour le moment</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Vos bonus apparaîtront ici</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.results.map((bonus) => (
                  <div key={bonus.id} className="px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-amber-200 dark:from-amber-900/40 dark:to-amber-800/40 shadow-lg shadow-amber-500/20 border border-amber-200/50 dark:border-amber-700/30 flex items-center justify-center flex-shrink-0">
                          <Gift className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-[15px] text-slate-900 dark:text-slate-100 truncate mb-1">{bonus.reason_bonus}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{formatDate(bonus.created_at)}</p>
                        </div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-black text-[15px] text-amber-600 dark:text-amber-400">+{bonus.amount} FCFA</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}

export default function BonusPage() {
  return (
    <AuthGuard>
      <BonusContent />
    </AuthGuard>
  )
}
