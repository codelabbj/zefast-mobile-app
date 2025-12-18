"use client"

import { useState, useEffect, useRef } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Check, Plus, Edit2, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Platform, Network, UserPhone, UserAppId, Settings } from "@/lib/types"
import { formatPhoneNumberForAPI } from "@/lib/utils"

function WithdrawContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  // Step state
  const [step, setStep] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | null>(null)
  const [selectedBetId, setSelectedBetId] = useState<UserAppId | null>(null)
  const [selectedNetwork, setSelectedNetwork] = useState<Network | null>(null)
  const [selectedPhone, setSelectedPhone] = useState<UserPhone | null>(null)
  const [amount, setAmount] = useState("")
  const [withdrawalCode, setWithdrawalCode] = useState("")
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [showUssdModal, setShowUssdModal] = useState(false)
  const [ussdCode, setUssdCode] = useState("")
  const [itemToDelete, setItemToDelete] = useState<{type: 'betId' | 'phone', id: number, name: string} | null>(null)
  const previousStepRef = useRef(1)
  const isNavigatingBackRef = useRef(false)

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
        params: { app_name: selectedPlatform.id },
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
      return response.data.filter((n) => n.active_for_with)
    },
    enabled: step === 3,
  })

  // Fetch phones filtered by selected network
  const { data: phones, isLoading: loadingPhones } = useQuery({
    queryKey: ["phones", selectedNetwork?.id],
    queryFn: async () => {
      const response = await api.get<UserPhone[]>("/mobcash/user-phone/", {
        params: { network: selectedNetwork?.id }
      })
      return response.data
    },
    enabled: step === 4 && !!selectedNetwork,
  })

  // Fetch settings for merchant phone numbers
  const { data: settings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => {
      const response = await api.get<Settings>("/mobcash/setting")
      return response.data
    },
  })

  // Delete bet ID mutation
  const deleteBetIdMutation = useMutation({
    mutationFn: async (betIdId: number) => {
      await api.delete(`/mobcash/user-app-id/${betIdId}`)
      return betIdId
    },
    onSuccess: (deletedId) => {
      // Refresh the bet IDs list
      queryClient.invalidateQueries({ queryKey: ["bet-ids", selectedPlatform?.id] })
      toast.success("ID de pari supprimé avec succès")
      // If the deleted bet ID was selected, clear selection
      if (selectedBetId?.id === deletedId) {
        setSelectedBetId(null)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la suppression de l'ID de pari")
    },
  })

  // Delete phone mutation
  const deletePhoneMutation = useMutation({
    mutationFn: async (phoneId: number) => {
      await api.delete(`/mobcash/user-phone/${phoneId}`)
      return phoneId
    },
    onSuccess: (deletedId) => {
      // Refresh the phones list
      queryClient.invalidateQueries({ queryKey: ["phones", selectedNetwork?.id] })
      toast.success("Numéro de téléphone supprimé avec succès")
      // If the deleted phone was selected, clear selection
      if (selectedPhone?.id === deletedId) {
        setSelectedPhone(null)
      }
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la suppression du numéro de téléphone")
    },
  })

  // Submit withdrawal mutation
  const withdrawalMutation = useMutation({
    mutationFn: async () => {
      const payload: any = {
        amount: Number(amount),
        phone_number: formatPhoneNumberForAPI(selectedPhone!.phone),
        app: selectedPlatform!.id,
        user_app_id: selectedBetId!.user_app_id,
        network: selectedNetwork!.id,
        withdriwal_code: withdrawalCode,
        source: "mobile",
      }
      
      const response = await api.post("/mobcash/transaction-withdrawal", payload)
      return response.data
    },
    onSuccess: (data) => {
      toast.success("Retrait créé avec succès! En attente de traitement.")

      // Handle network-specific payment flows
      if (selectedNetwork?.name?.toLowerCase() === 'moov') {
        handleMoovWithdrawal(data)
      } else if (selectedNetwork?.name?.toLowerCase() === 'orange') {
        handleOrangeWithdrawal(data)
      } else {
        // Default behavior for other networks
      router.push("/dashboard")
      }
    },
    onError: (error: any) => {
      // Check for rate limiting error with time message
      const errorTimeMessage = 
        error?.originalError?.response?.data?.error_time_message ||
        error?.response?.data?.error_time_message
      
      if (errorTimeMessage && Array.isArray(errorTimeMessage) && errorTimeMessage.length > 0) {
        const timeMessage = errorTimeMessage[0]
        toast.error(`Trop de tentatives. Veuillez réessayer dans ${timeMessage}`)
      } else {
        toast.error(error.message || "Erreur lors de la création du retrait")
      }
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
      if (!withdrawalCode || withdrawalCode.length < 4) {
        toast.error("Veuillez saisir un code de retrait valide")
        return
      }
      if (selectedPlatform && amountNum < selectedPlatform.minimun_with) {
        toast.error(`Le montant minimum est ${selectedPlatform.minimun_with} FCFA`)
        return
      }
      if (selectedPlatform && amountNum > selectedPlatform.max_win) {
        toast.error(`Le montant maximum est ${selectedPlatform.max_win} FCFA`)
        return
      }
      setShowConfirmDialog(true)
      return
    }
    setStep(step + 1)
  }

  const handleConfirm = () => {
    setShowConfirmDialog(false)
    withdrawalMutation.mutate()
  }

  // Handle Moov network withdrawal
  const handleMoovWithdrawal = (transactionData: any) => {
    if (!settings || !selectedNetwork) {
      router.push("/dashboard")
      return
    }

    // For withdrawals, use the full amount (no percentage deduction)
    const withdrawalAmount = Number(amount)

    // Get the correct merchant phone based on country code
    let merchantPhone = settings.moov_marchand_phone
    if (selectedNetwork.country_code?.toLowerCase() === 'bf') {
      merchantPhone = settings.bf_moov_marchand_phone || settings.moov_marchand_phone
    }

    const ussdCode = `*155*2*1*${merchantPhone}*${withdrawalAmount}#`

    // Try to open phone dialer
    try {
      window.location.href = `tel:${ussdCode}`
      // If we reach here, the dialer might not have opened, show modal
      setTimeout(() => {
        setUssdCode(ussdCode)
        setShowUssdModal(true)
      }, 1000)
    } catch (error) {
      // If dialer fails, show modal immediately
      setUssdCode(ussdCode)
      setShowUssdModal(true)
    }
  }

  // Handle Orange network withdrawal
  const handleOrangeWithdrawal = (transactionData: any) => {
    if (!settings || !selectedNetwork) {
      router.push("/dashboard")
      return
    }

    // For withdrawals, check if payment_by_link is enabled and transaction_link exists
    if (selectedNetwork.payment_by_link && transactionData?.transaction_link) {
      // For withdrawals, we might not have transaction_link, so show USSD
      // But let's check if it exists first
      router.push("/dashboard")
      return
    }

    // Fallback to USSD code for withdrawals
    const withdrawalAmount = Number(amount)

    // Get the correct merchant phone based on country code
    let merchantPhone = settings.orange_marchand_phone || ''
    if (selectedNetwork.country_code?.toLowerCase() === 'bf') {
      merchantPhone = settings.bf_orange_marchand_phone || settings.orange_marchand_phone || ''
    }

    if (merchantPhone) {
      const ussdCode = `*144*2*1*${merchantPhone}*${withdrawalAmount}#`

      // Try to open phone dialer
      try {
        window.location.href = `tel:${ussdCode}`
        // If we reach here, the dialer might not have opened, show modal
        setTimeout(() => {
          setUssdCode(ussdCode)
          setShowUssdModal(true)
        }, 1000)
      } catch (error) {
        // If dialer fails, show modal immediately
        setUssdCode(ussdCode)
        setShowUssdModal(true)
      }
    } else {
      // No merchant phone configured, redirect to dashboard
      router.push("/dashboard")
    }
  }

  // Track step changes to detect forward/backward navigation
  useEffect(() => {
    const isMovingForward = step > previousStepRef.current
    const isMovingBackward = step < previousStepRef.current
    
    if (isMovingBackward) {
      isNavigatingBackRef.current = true
      // Reset the flag after a short delay
      setTimeout(() => {
        isNavigatingBackRef.current = false
      }, 500)
    } else if (isMovingForward) {
      isNavigatingBackRef.current = false
    }
    
    previousStepRef.current = step
  }, [step])

  // Auto-advance when selections are made (only when moving forward)
  useEffect(() => {
    if (step === 1 && selectedPlatform && !isNavigatingBackRef.current) {
      // Small delay to show selection feedback before advancing
      const timer = setTimeout(() => {
        if (!isNavigatingBackRef.current) {
          setStep(2)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [step, selectedPlatform])

  useEffect(() => {
    if (step === 2 && selectedBetId && !isNavigatingBackRef.current) {
      const timer = setTimeout(() => {
        if (!isNavigatingBackRef.current) {
          setStep(3)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [step, selectedBetId])

  useEffect(() => {
    if (step === 3 && selectedNetwork && !isNavigatingBackRef.current) {
      const timer = setTimeout(() => {
        if (!isNavigatingBackRef.current) {
          setStep(4)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [step, selectedNetwork])

  useEffect(() => {
    if (step === 4 && selectedPhone && !isNavigatingBackRef.current) {
      const timer = setTimeout(() => {
        if (!isNavigatingBackRef.current) {
          setStep(5)
        }
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [step, selectedPhone])

  // Auto-advance when continuing from add-phone page
  useEffect(() => {
    const shouldContinue = searchParams.get("continue")
    if (shouldContinue === "true" && step === 1 && selectedPlatform && !isNavigatingBackRef.current) {
      // Clear the continue parameter from URL
      const newUrl = new URL(window.location.href)
      newUrl.searchParams.delete("continue")
      window.history.replaceState({}, "", newUrl.toString())

      // Auto-advance to step 2
      setStep(2)
    }
  }, [searchParams, step, selectedPlatform])

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
              <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 bg-clip-text text-transparent">{t("withdraw")}</h1>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">Étape {step} sur 5</p>
            </div>
          </div>
          
          {/* Progress Bar */}
          <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden shadow-inner">
            <div className="h-full bg-gradient-to-r from-primary to-accent transition-all duration-300 rounded-full shadow-lg shadow-primary/30" style={{ width: `${(step / 5) * 100}%` }} />
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
                <div className="text-center py-8">{t("loading")}</div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  {platforms?.map((platform) => (
                    <div
                      key={platform.id}
                      onClick={() => setSelectedPlatform(platform)}
                      className={`relative p-4 rounded-2xl border-2 cursor-pointer transition-all shadow-sm hover:shadow-md active:scale-95 ${
                        selectedPlatform?.id === platform.id
                          ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 shadow-lg shadow-primary/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {selectedPlatform?.id === platform.id && (
                        <div className="absolute top-2 right-2 bg-gradient-to-br from-primary to-accent rounded-full p-1.5 shadow-lg shadow-primary/30">
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
                        {platform.minimun_with} - {platform.max_win} FCFA
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
                        className={`p-4 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md ${
                          selectedBetId?.id === betId.id
                            ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 shadow-lg shadow-primary/20"
                            : "border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 bg-white dark:bg-slate-800"
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div
                            className="flex-1 cursor-pointer"
                            onClick={() => setSelectedBetId(betId)}
                          >
                            <p className="font-bold text-slate-900 dark:text-slate-100">{betId.user_app_id}</p>
                            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">ID de pari</p>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                          {selectedBetId?.id === betId.id && (
                            <div className="bg-gradient-to-br from-primary to-accent rounded-full p-1.5 shadow-lg shadow-primary/30">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                          )}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                router.push(`/add-bet-id?platform=${selectedPlatform?.id}&edit=${betId.id}`)
                              }}
                              className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                              title="Modifier"
                            >
                              <Edit2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setItemToDelete({type: 'betId', id: betId.id, name: betId.user_app_id})
                                setShowDeleteDialog(true)
                              }}
                              className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                              title="Supprimer"
                              disabled={deleteBetIdMutation.isPending}
                            >
                              <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                            </button>
                          </div>
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
                          ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 shadow-lg shadow-primary/20"
                          : "border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 bg-white dark:bg-slate-800"
                      }`}
                    >
                      {selectedNetwork?.id === network.id && (
                        <div className="absolute top-2 right-2 bg-gradient-to-br from-primary to-accent rounded-full p-1.5 shadow-lg shadow-primary/30">
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
                          className={`p-4 rounded-2xl border-2 transition-all shadow-sm hover:shadow-md ${
                            selectedPhone?.id === phone.id
                              ? "border-primary bg-gradient-to-br from-primary/10 to-primary/5 dark:from-primary/20 dark:to-primary/10 shadow-lg shadow-primary/20"
                              : "border-slate-200 dark:border-slate-700 hover:border-primary/50 dark:hover:border-primary/50 bg-white dark:bg-slate-800"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div
                              className="flex-1 cursor-pointer"
                              onClick={() => setSelectedPhone(phone)}
                            >
                              <p className="font-bold text-slate-900 dark:text-slate-100">{phone.phone}</p>
                              <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">Numéro de téléphone</p>
                            </div>
                            <div className="flex items-center gap-2 ml-3">
                            {selectedPhone?.id === phone.id && (
                              <div className="bg-gradient-to-br from-primary to-accent rounded-full p-1.5 shadow-lg shadow-primary/30">
                                  <Check className="h-3 w-3 text-white" />
                              </div>
                            )}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  router.push(`/add-phone?network=${selectedNetwork?.id}&edit=${phone.id}`)
                                }}
                                className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                                title="Modifier"
                              >
                                <Edit2 className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setItemToDelete({type: 'phone', id: phone.id, name: phone.phone})
                                  setShowDeleteDialog(true)
                                }}
                                className="p-1.5 rounded-lg bg-red-50 dark:bg-red-950/30 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors"
                                title="Supprimer"
                                disabled={deletePhoneMutation.isPending}
                              >
                                <Trash2 className="h-3.5 w-3.5 text-red-600 dark:text-red-400" />
                              </button>
                            </div>
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
                    onClick={() => router.push(`/add-phone?network=${selectedNetwork?.id}&from=withdraw`)}
                  >
                    <Plus className="h-5 w-5" />
                    {t("addPhone")} ({selectedNetwork?.public_name})
                  </button>
                </>
              )}
            </div>
          </div>
        )}

        {/* Step 5: Enter Amount and Withdrawal Code */}
        {step === 5 && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{t("enterAmount")}</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                Montant: {selectedPlatform?.minimun_with} - {selectedPlatform?.max_win} FCFA
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

              <div className="space-y-3">
                <Label htmlFor="withdrawalCode" className="mobile-text font-medium">{t("withdrawalCode")}</Label>
                <Input
                  id="withdrawalCode"
                  type="text"
                  placeholder="1234"
                  value={withdrawalCode}
                  onChange={(e) => setWithdrawalCode(e.target.value)}
                  className="mobile-input text-lg"
                />
                <p className="mobile-text text-muted-foreground">
                  Entrez le code de retrait fourni par votre plateforme de paris
                </p>
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
                {selectedPlatform?.city && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Ville</span>
                    <span className="font-medium">{selectedPlatform.city}</span>
                  </div>
                )}
                {selectedPlatform?.street && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Rue</span>
                    <span className="font-medium">{selectedPlatform.street}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Network Message */}
        {step === 5 && selectedNetwork?.withdrawal_message && selectedNetwork.withdrawal_message.trim() && (
          <div className="bg-blue-50 dark:bg-blue-950/30 rounded-3xl border border-blue-200/50 dark:border-blue-800/50 overflow-hidden shadow-xl shadow-blue-200/30 dark:shadow-blue-900/30">
            <div className="p-5">
              <div className="flex items-start gap-3">
                <svg className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="text-sm text-blue-900 dark:text-blue-100 leading-relaxed">
                  {selectedNetwork.withdrawal_message}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tutorial Button for Withdrawal */}
        {step === 5 && selectedPlatform?.withdrawal_tuto_link && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="p-5">
              <button
                onClick={() => window.open(selectedPlatform.withdrawal_tuto_link, '_blank', 'noopener,noreferrer')}
                className="w-full h-12 rounded-2xl bg-gradient-to-br from-blue-500 to-blue-600 dark:from-blue-600 dark:to-blue-700 text-white hover:from-blue-600 hover:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 active:scale-[0.98] transition-all duration-200 font-semibold text-sm shadow-lg shadow-blue-500/30 hover:shadow-xl hover:shadow-blue-500/40 flex items-center justify-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Comment retirer
              </button>
            </div>
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3">
          {step > 1 && (
            <button
              onClick={() => {
                isNavigatingBackRef.current = true
                setStep(step - 1)
              }}
              className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700 hover:from-slate-200 hover:to-slate-300 dark:hover:from-slate-700 dark:hover:to-slate-600 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200 font-semibold text-sm text-slate-700 dark:text-slate-300"
            >
              {t("previous")}
            </button>
          )}
          <button
            onClick={handleNext}
            className="flex-1 h-12 rounded-2xl bg-gradient-to-br from-primary to-accent dark:from-primary dark:to-accent text-white hover:from-accent hover:to-primary dark:hover:from-accent dark:hover:to-primary active:scale-[0.98] transition-all duration-200 font-bold text-sm shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
          >
            {step === 5 ? t("confirm") : t("next")}
          </button>
        </div>
      </main>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirmer le retrait</DialogTitle>
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
            {selectedPlatform?.city && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ville</span>
                <span className="font-medium">{selectedPlatform.city}</span>
              </div>
            )}
            {selectedPlatform?.street && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Rue</span>
                <span className="font-medium">{selectedPlatform.street}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">{t("withdrawalCode")}</span>
              <span className="font-medium">{withdrawalCode}</span>
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>{t("amount")}</span>
              <span className="text-primary">{amount} FCFA</span>
            </div>
          </div>
          <div className="flex gap-4">
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)} className="flex-1">
              {t("cancel")}
            </Button>
            <Button onClick={handleConfirm} disabled={withdrawalMutation.isPending} className="flex-1">
              {withdrawalMutation.isPending ? t("loading") : t("confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Confirmer la suppression</DialogTitle>
            <DialogDescription>
              Êtes-vous sûr de vouloir supprimer {itemToDelete?.type === 'betId' ? 'cet ID de pari' : 'ce numéro de téléphone'} ?
              <br />
              <strong className="text-slate-900 dark:text-slate-100">{itemToDelete?.name}</strong>
              <br />
              <span className="text-sm text-muted-foreground mt-2 block">
                Cette action ne peut pas être annulée.
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowDeleteDialog(false)
                setItemToDelete(null)
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                if (itemToDelete) {
                  if (itemToDelete.type === 'betId') {
                    deleteBetIdMutation.mutate(itemToDelete.id)
                  } else {
                    deletePhoneMutation.mutate(itemToDelete.id)
                  }
                  setShowDeleteDialog(false)
                  setItemToDelete(null)
                }
              }}
              disabled={deleteBetIdMutation.isPending || deletePhoneMutation.isPending}
              className="flex-1 bg-red-500 hover:bg-red-600 text-white"
            >
              {deleteBetIdMutation.isPending || deletePhoneMutation.isPending ? "Suppression..." : "Supprimer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* USSD Code Modal */}
      <Dialog open={showUssdModal} onOpenChange={setShowUssdModal}>
        <DialogContent className="bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-blue-600 dark:text-blue-400">Code USSD</DialogTitle>
            <DialogDescription>
              Le composeur téléphonique ne s'est pas ouvert automatiquement. Veuillez copier le code ci-dessous et le coller dans votre composeur téléphonique.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="font-mono text-lg text-center select-all">{ussdCode}</p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  navigator.clipboard.writeText(ussdCode)
                  toast.success("Code copié dans le presse-papiers")
                }}
                className="flex-1"
                variant="outline"
              >
                Copier
              </Button>
              <Button
                onClick={() => {
                  window.location.href = `tel:${ussdCode}`
                  setShowUssdModal(false)
                }}
                className="flex-1"
              >
                Composer
              </Button>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowUssdModal(false)
                router.push("/dashboard")
              }}
              className="flex-1"
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function WithdrawPage() {
  return (
    <AuthGuard>
      <WithdrawContent />
    </AuthGuard>
  )
}
