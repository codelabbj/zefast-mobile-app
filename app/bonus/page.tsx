"use client"

import { useEffect, useState } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Gift, TrendingUp } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import { getUser } from "@/lib/auth"
import api from "@/lib/api"
import type { Bonus, PaginatedResponse, Platform, UserAppId } from "@/lib/types"
import { formatDate } from "@/lib/utils"

interface SettingsResponse {
  referral_bonus: boolean
}

function BonusContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const user = getUser()
  const queryClient = useQueryClient()
  const [selectedPlatform, setSelectedPlatform] = useState<string>("")
  const [selectedBetId, setSelectedBetId] = useState<string>("")
  const [bonusAmount, setBonusAmount] = useState("")

  // Fetch settings to check referral_bonus
  const { data: settings, isLoading: loadingSettings } = useQuery<SettingsResponse>({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get("/mobcash/setting")
      return response.data
    },
  })

  // Fetch platforms
  const { data: platforms } = useQuery<Platform[]>({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await api.get<Platform[]>("/mobcash/plateform")
      return response.data.filter((p) => p.enable)
    },
  })

  // Fetch bet IDs for selected platform
  const { data: betIds } = useQuery<UserAppId[]>({
    queryKey: ["bet-ids", selectedPlatform],
    queryFn: async () => {
      if (!selectedPlatform) return []
      const response = await api.get<UserAppId[]>("/mobcash/user-app-id", {
        params: { bet_app: selectedPlatform },
      })
      return response.data
    },
    enabled: !!selectedPlatform,
  })

  // Create bonus transaction mutation
  const useBonusMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/mobcash/transaction-bonus", {
        app: selectedPlatform,
        user_app_id: selectedBetId,
        amount: Number(bonusAmount),
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Transaction bonus créée avec succès!")
      queryClient.invalidateQueries({ queryKey: ["bonus"] })
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
      setSelectedPlatform("")
      setSelectedBetId("")
      setBonusAmount("")
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création de la transaction bonus")
    },
  })

  // Redirect if referral_bonus is false
  useEffect(() => {
    if (!loadingSettings && settings && settings.referral_bonus === false) {
      router.push("/dashboard")
    }
  }, [settings, loadingSettings, router])

  const { data, isLoading } = useQuery({
    queryKey: ["bonus"],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<Bonus>>("/mobcash/bonus")
      return response.data
    },
    enabled: settings?.referral_bonus === true,
  })

  // Don't render if referral_bonus is disabled
  if (loadingSettings || !settings || settings.referral_bonus === false) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-indigo-500 border-r-transparent mb-3"></div>
          <p className="text-sm font-semibold">{t("loading")}</p>
        </div>
      </div>
    )
  }

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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">{t("bonus")}</h1>
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

        {/* Use Bonus Form */}
        {user && user.bonus_available > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Utiliser le bonus</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                Utilisez votre bonus pour une transaction
              </p>
            </div>
            <div className="p-5 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">Plateforme</Label>
                <Select
                  value={selectedPlatform}
                  onValueChange={(value) => {
                    setSelectedPlatform(value)
                    setSelectedBetId("") // Reset bet ID when platform changes
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une plateforme" />
                  </SelectTrigger>
                  <SelectContent>
                    {platforms?.map((platform) => (
                      <SelectItem key={platform.id} value={platform.id}>
                        <div className="flex items-center gap-2">
                          <img
                            src={platform.image || "/placeholder.svg"}
                            alt={platform.name}
                            className="w-6 h-6 object-contain"
                          />
                          {platform.name}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedPlatform && (
                <div className="space-y-2">
                  <Label htmlFor="betId">ID de pari</Label>
                  {betIds && betIds.length > 0 ? (
                    <Select value={selectedBetId} onValueChange={setSelectedBetId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionner un ID de pari" />
                      </SelectTrigger>
                      <SelectContent>
                        {betIds.map((betId) => (
                          <SelectItem key={betId.id} value={betId.user_app_id}>
                            {betId.user_app_id}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="p-3 border rounded-md bg-muted text-sm text-muted-foreground">
                      Aucun ID de pari disponible. Ajoutez-en un depuis la page de dépôt.
                    </div>
                  )}
                </div>
              )}

              {selectedPlatform && selectedBetId && (
                <div className="space-y-2">
                  <Label htmlFor="bonusAmount">Montant du bonus (FCFA)</Label>
                  <Input
                    id="bonusAmount"
                    type="number"
                    placeholder="1000"
                    value={bonusAmount}
                    onChange={(e) => setBonusAmount(e.target.value)}
                    max={user.bonus_available}
                    min={1}
                  />
                  <p className="text-xs text-muted-foreground">
                    Disponible: {user.bonus_available.toLocaleString()} FCFA
                  </p>
                </div>
              )}

              <Button
                onClick={() => {
                  if (!selectedPlatform) {
                    toast.error("Veuillez sélectionner une plateforme")
                    return
                  }
                  if (!selectedBetId) {
                    toast.error("Veuillez sélectionner un ID de pari")
                    return
                  }
                  if (!bonusAmount || Number(bonusAmount) <= 0) {
                    toast.error("Veuillez saisir un montant valide")
                    return
                  }
                  if (Number(bonusAmount) > user.bonus_available) {
                    toast.error(`Le montant ne peut pas dépasser ${user.bonus_available.toLocaleString()} FCFA`)
                    return
                  }
                  useBonusMutation.mutate()
                }}
                disabled={useBonusMutation.isPending || !selectedPlatform || !selectedBetId || !bonusAmount}
                className="w-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
              >
                {useBonusMutation.isPending ? t("loading") : "Utiliser le bonus"}
              </Button>
            </div>
          </div>
        )}

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
