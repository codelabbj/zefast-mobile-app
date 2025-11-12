"use client"

import { useQuery } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Ticket, Copy, Check } from "lucide-react"
import { useState } from "react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Coupon, PaginatedResponse, Platform } from "@/lib/types"
import { formatDate } from "@/lib/utils"

function CouponContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ["coupons"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Coupon>>("/mobcash/coupon")
      return response.data
    },
  })

  // Fetch platforms to get platform names
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await api.get<Platform[]>("/mobcash/plateform")
      return response.data
    },
  })

  const getPlatformName = (betAppId: string) => {
    const platform = platforms?.find((p) => p.id === betAppId)
    return platform?.name || "Plateforme inconnue"
  }

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
    setCopiedCode(code)
    toast.success("Code copié dans le presse-papiers!")
    setTimeout(() => setCopiedCode(null), 2000)
  }

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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">
              Mes Coupons
            </h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 space-y-5 pb-8 safe-area-bottom">
        {/* Summary Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-600 dark:text-slate-400 mb-2 font-semibold uppercase tracking-wide">
                  Total de coupons
                </p>
                <p className="text-3xl font-black text-slate-900 dark:text-slate-100">
                  {data?.count || 0}
                </p>
              </div>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-900/40 dark:to-pink-800/40 shadow-lg shadow-purple-500/20 border border-purple-200/50 dark:border-purple-700/30 flex items-center justify-center">
                <Ticket className="h-8 w-8 text-purple-600 dark:text-purple-400" />
              </div>
            </div>
          </div>
        </div>

        {/* Coupons List */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
            <div>
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Liste des coupons</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                {data?.count || 0} coupon{(data?.count || 0) > 1 ? "s" : ""} disponible{(data?.count || 0) > 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <div>
            {isLoading ? (
              <div className="text-center py-16 text-slate-500">
                <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-purple-500 border-r-transparent mb-3"></div>
                <p className="text-sm font-semibold">{t("loading")}</p>
              </div>
            ) : !data?.results || data.results.length === 0 ? (
              <div className="text-center py-16 text-slate-500">
                <div className="w-16 h-16 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 flex items-center justify-center shadow-inner">
                  <Ticket className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                </div>
                <p className="text-sm font-semibold">Aucun coupon disponible</p>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Vos coupons apparaîtront ici
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.results.map((coupon) => (
                  <div
                    key={coupon.id}
                    className="px-5 py-4 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="flex items-center gap-4 flex-1 min-w-0">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-200 dark:from-purple-900/40 dark:to-pink-800/40 shadow-lg shadow-purple-500/20 border border-purple-200/50 dark:border-purple-700/30 flex items-center justify-center flex-shrink-0">
                          <Ticket className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-black text-[15px] text-slate-900 dark:text-slate-100">
                              {coupon.code}
                            </p>
                            <button
                              onClick={() => handleCopyCode(coupon.code)}
                              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                              title="Copier le code"
                            >
                              {copiedCode === coupon.code ? (
                                <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                              ) : (
                                <Copy className="h-4 w-4 text-slate-500 dark:text-slate-400" />
                              )}
                            </button>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mb-1">
                            {getPlatformName(coupon.bet_app)}
                          </p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                            {formatDate(coupon.created_at)}
                          </p>
                        </div>
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

export default function CouponPage() {
  return (
    <AuthGuard>
      <CouponContent />
    </AuthGuard>
  )
}

