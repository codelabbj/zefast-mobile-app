"use client"

import { useState } from "react"
import { useQuery, useMutation } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, Check, Plus } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Platform, Network, UserPhone, UserAppId } from "@/lib/types"

function DepositContent() {
  const { t } = useTranslation()
  const router = useRouter()

  // Step state
  const [step, setStep] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedBetId, setSelectedBetId] = useState<UserAppId | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)
  const [selectedPhone, setSelectedPhone] = useState<UserPhone | null>(null)
  const [amount, setAmount] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  // Fetch platforms
  const { data: platforms, isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await api.get<Platform[]>("/mobcash/plateform")
      return response.data.filter((p) => p.enable)
    },
  })

  // Fetch bet IDs
  const { data: betIds, isLoading: loadingBetIds } = useQuery({
    queryKey: ["bet-ids", selectedPlatform?.id],
    queryFn: async () => {
      if (!selectedPlatform) return []
      const response = await api.get<UserAppId[]>("/mobcash/user-app-id", {
        params: { bet_app: selectedPlatform.id },
      })
      return response.data
    },
    enabled: !!selectedPlatform && step === 2,
  })

  // Fetch networks
  const { data: networks, isLoading: loadingNetworks } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => {
      const response = await api.get<Network[]>("/mobcash/network")
      return response.data.filter((n) => n.active_for_deposit)
    },
    enabled: step === 3,
  })

  // Fetch phones filtered by selected network
  const { data: phones, isLoading: loadingPhones } = useQuery({
    queryKey: ["phones", selectedNetwork?.id],
    queryFn: async () => {
      const response = await api.get<UserPhone[]>("/mobcash/user-phone/")
      return response.data.filter((phone) => phone.network === selectedNetwork?.id)
    },
    enabled: step === 4 && !!selectedNetwork,
  })

  // Submit deposit mutation
  const depositMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/mobcash/transaction-deposit", {
        amount: Number(amount),
        phone_number: selectedPhone!.phone,
        app: selectedPlatform!.id,
        user_app_id: selectedBetId!.user_app_id,
        network: selectedNetwork!.id,
        source: "web",
      })
      return response.data
    },
    onSuccess: (data) => {
      toast.success("Dépôt créé avec succès! En attente de confirmation.")
      router.push("/dashboard")
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la création du dépôt")
    },
  })

  const handleNext = () => {
    if (step === 1 && !selectedPlatform) {
      toast.error("Veuillez sélectionner une plateforme")
      return
    }
    if (step === 2 && !selectedBetId) {
      toast.error("Veuillez sélectionner un identifiant de pari")
      return
    }
    if (step === 3 && !selectedNetwork) {
      toast.error("Veuillez sélectionner un réseau")
      return
    }
    if (step === 4 && !selectedPhone) {
      toast.error("Veuillez sélectionner un numéro de téléphone")
      return
    }
    if (step === 5) {
      const amountNum = Number(amount)
      if (!amount || amountNum <= 0) {
        toast.error("Veuillez saisir un montant valide")
        return
      }
      if (selectedPlatform && amountNum < selectedPlatform.minimun_deposit) {
        toast.error(`Le montant minimum est ${selectedPlatform.minimun_deposit} FCFA`)
        return
      }
      if (selectedPlatform && amountNum > selectedPlatform.max_deposit) {
        toast.error(`Le montant maximum est ${selectedPlatform.max_deposit} FCFA`)
        return
      }
      setShowConfirmDialog(true)
      return
    }
    setStep(step + 1)
  }

  const handleConfirm = () => {
    setShowConfirmDialog(false)
    depositMutation.mutate()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      {/* Mobile Header */}
      <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 sticky top-0 z-50 safe-area-top shadow-sm">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              className="h-11 w-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-700 dark:hover:to-slate-600 border border-slate-200/50 dark:border-slate-700/50 shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center"
              onClick={() => (step > 1 ? setStep(step - 1) : router.back())}
            >
              <ArrowLeft className="h-5 w-5 text-slate-700 dark:text-slate-300" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">{t("deposit")}</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Étape {step} sur 5</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-300 rounded-full shadow-lg shadow-emerald-500/30"
              style={{ width: `${(step / 5) * 100}%` }}
            />
          </div>
        </div>
      </header>

      <main className="px-5 py-6 space-y-5 pb-8 safe-area-bottom">
        {/* Step 1: Select Platform */}
        {step === 1 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("selectPlatform")}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Choisissez votre plateforme de paris</p>
            </div>
            <div className="p-5">
              {loadingPlatforms ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mb-2"></div>
                  <p className="text-sm">{t("loading")}</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  {platforms?.map((platform) => (
                    <div
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-95 ${
                        selectedPlatform?.id === platform.id
                          ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 shadow-lg shadow-emerald-500/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {selectedPlatform?.id === platform.id && (
                        <div className="absolute top-2 right-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full p-1.5 shadow-lg shadow-emerald-500/30">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                      <img
                        src={platform.image || "/placeholder.svg"}
                        alt={platform.name}
                        className="w-full h-14 object-contain mb-3 rounded-lg"
                      />
                      <p className="text-center text-sm font-bold text-slate-900 dark:text-slate-100">{platform.name}</p>
                      <p className="text-center text-xs text-slate-600 dark:text-slate-400 mt-1.5 font-medium">
                        {platform.minimun_deposit.toLocaleString()} - {platform.max_deposit.toLocaleString()} FCFA
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 2: Select Bet ID */}
        {step === 2 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("selectBetId")}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Choisissez votre identifiant de pari</p>
            </div>
            <div className="p-5 space-y-4">
              {loadingBetIds ? (
                <div className="text-center py-8">{t("loading")}</div>
              ) : (
                <>
                  <div className="space-y-2">
                    {betIds?.map((betId) => (
                      <div
                        key={betId.id}
                        onClick={() => setSelectedBetId(betId)}
                        className={`p-4 rounded-2xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-95 ${
                          selectedBetId?.id === betId.id
                            ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 shadow-lg shadow-emerald-500/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-bold text-slate-900 dark:text-slate-100">{betId.user_app_id}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">ID de pari</p>
                          </div>
                          {selectedBetId?.id === betId.id && (
                            <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full p-1.5 shadow-lg shadow-emerald-500/30">
                              <Check className="h-4 w-4 text-white" />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    className="w-full h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-700 dark:hover:to-slate-600 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
                    onClick={() => router.push(`/add-bet-id?platform=${selectedPlatform?.id}`)}
                  >
                    <Plus className="h-5 w-5" />
                    {t("addBetId")}
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Select Network */}
        {step === 3 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("selectNetwork")}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Choisissez votre réseau de paiement</p>
            </div>
            <div className="p-5">
              {loadingNetworks ? (
                <div className="text-center py-8">{t("loading")}</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {networks?.map((network) => (
                    <div
                      key={network.id}
                      onClick={() => setSelectedNetwork(network)}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-95 ${
                        selectedNetwork?.id === network.id
                          ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 shadow-lg shadow-emerald-500/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {selectedNetwork?.id === network.id && (
                        <div className="absolute top-2 right-2 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full p-1.5 shadow-lg shadow-emerald-500/30">
                          <Check className="h-3.5 w-3.5 text-white" />
                        </div>
                      )}
                      <img
                        src={network.image || "/placeholder.svg"}
                        alt={network.name}
                        className="w-full h-16 object-contain mb-3 rounded-lg"
                      />
                      <p className="text-center font-bold text-sm text-slate-900 dark:text-slate-100">{network.public_name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 4: Select Phone */}
        {step === 4 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("selectPhone")}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Choisissez votre numéro de téléphone</p>
            </div>
            <div className="p-5 space-y-4">
              {loadingPhones ? (
                <div className="text-center py-8">{t("loading")}</div>
              ) : (
                <>
                  {phones && phones.length > 0 ? (
                    <div className="space-y-2">
                      {phones.map((phone) => (
                        <div
                          key={phone.id}
                          onClick={() => setSelectedPhone(phone)}
                          className={`p-4 rounded-2xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-95 ${
                            selectedPhone?.id === phone.id
                              ? "border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-900/30 shadow-lg shadow-emerald-500/20"
                              : "border-slate-200 dark:border-slate-700 hover:border-emerald-300 dark:hover:border-emerald-700 bg-white dark:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-bold text-slate-900 dark:text-slate-100">{phone.phone}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">Numéro de téléphone</p>
                            </div>
                            {selectedPhone?.id === phone.id && (
                              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-full p-1.5 shadow-lg shadow-emerald-500/30">
                                <Check className="h-4 w-4 text-white" />
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Aucun numéro de téléphone disponible pour {selectedNetwork?.public_name}</p>
                      <p className="text-sm mt-2">Ajoutez un nouveau numéro ci-dessous</p>
                    </div>
                  )}

                  <button
                    className="w-full h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-700 dark:hover:to-slate-600 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center justify-center gap-2"
                    onClick={() => router.push(`/add-phone?network=${selectedNetwork?.id}`)}
                  >
                    <Plus className="h-5 w-5" />
                    {t("addPhone")} ({selectedNetwork?.public_name})
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Enter Amount */}
        {step === 5 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("enterAmount")}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                Montant: {selectedPlatform?.minimun_deposit} - {selectedPlatform?.max_deposit} FCFA
              </p>
            </div>
            <div className="p-5 space-y-6">
              <div className="space-y-3">
                <Label htmlFor="amount" className="mobile-text font-medium">{t("amount")} (FCFA)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="1000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="mobile-input text-lg"
                />
              </div>

              {/* Summary */}
              <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 rounded-2xl space-y-3 text-sm border border-slate-200 dark:border-slate-600 shadow-inner">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("platform")}</span>
                  <span className="font-medium">{selectedPlatform?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">ID de pari</span>
                  <span className="font-medium">{selectedBetId?.user_app_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("network")}</span>
                  <span className="font-medium">{selectedNetwork?.public_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("phone")}</span>
                  <span className="font-medium">{selectedPhone?.phone}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => setStep(step - 1)}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-700 dark:hover:to-slate-600 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 font-semibold text-sm text-slate-700 dark:text-slate-300"
            >
              {t("previous")}
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white hover:from-emerald-600 hover:to-emerald-700 dark:hover:from-emerald-700 dark:hover:to-emerald-800 active:scale-[0.98] transition-all duration-200 font-bold text-sm shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
          >
            {step === 5 ? t("confirm") : t("next")}
          </button>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le dépôt</DialogTitle>
            <DialogDescription>Veuillez vérifier les informations avant de confirmer</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("platform")}</span>
              <span className="font-medium">{selectedPlatform?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">ID de pari</span>
              <span className="font-medium">{selectedBetId?.user_app_id}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("network")}</span>
              <span className="font-medium">{selectedNetwork?.public_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("phone")}</span>
              <span className="font-medium">{selectedPhone?.phone}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>{t("amount")}</span>
              <span className="text-emerald-500">{amount} FCFA</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={depositMutation.isPending} className="flex-1">
              {depositMutation.isPending ? t("loading") : t("confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function DepositPage() {
  return (
    <AuthGuard>
      <DepositContent />
    </AuthGuard>
  )
}
