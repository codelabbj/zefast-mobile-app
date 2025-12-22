"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft, Search, Check } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Platform, UserAppId } from "@/lib/types"

interface SearchUserResponse {
  UserId: number
  Name: string
  CurrencyId: number
}

function AddBetIdContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()

  const [appId, setAppId] = useState("")
  const [platformId, setPlatformId] = useState<string>(searchParams.get("platform") || "")
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const [searchResult, setSearchResult] = useState<SearchUserResponse | null>(null)
  const [pendingBetId, setPendingBetId] = useState<{ appId: string; betId: string } | null>(null)

  // Check if we should auto-continue after creation
  const fromPage = searchParams.get("from") // "deposit" or "withdraw"
  // Check if we're editing an existing bet ID
  const editId = searchParams.get("edit")
  const isEditing = !!editId

  // Fetch platforms
  const { data: platforms, isLoading: loadingPlatforms } = useQuery({
    queryKey: ["platforms"],
    queryFn: async () => {
      const response = await api.get<Platform[]>("/mobcash/plateform")
      return response.data.filter((p) => p.enable)
    },
  })

  // Fetch saved bet IDs for the selected platform
  const { data: savedBetIds, isLoading: loadingSavedBetIds } = useQuery({
    queryKey: ["bet-ids", platformId],
    queryFn: async () => {
      if (!platformId) return []
      const response = await api.get<UserAppId[]>("/mobcash/user-app-id", {
        params: { app_name: platformId },
      })
      return response.data
    },
    enabled: !!platformId,
  })

  // Fetch bet ID to edit
  const { data: betIdToEdit, isLoading: loadingBetIdToEdit } = useQuery({
    queryKey: ["bet-id", editId],
    queryFn: async () => {
      if (!editId) return null
      const response = await api.get<UserAppId>(`/mobcash/user-app-id/${editId}`)
      return response.data
    },
    enabled: !!editId,
  })

  // Search user mutation
  const searchUserMutation = useMutation({
    mutationFn: async ({ appId, betId }: { appId: string; betId: string }) => {
      const response = await api.post<SearchUserResponse>(
        `/mobcash/search-user`,
        {
          app_id: appId,
          userid: betId,
        }
      )
      return response.data
    },
    onSuccess: (data) => {
      // Validate user exists
      if (data.UserId === 0) {
        setErrorMessage("Utilisateur non trouvé. Veuillez vérifier l'identifiant de pari.")
        setShowErrorModal(true)
        return
      }

      // Validate currency
      if (data.CurrencyId !== 27) {
        setErrorMessage("La devise de cet utilisateur n'est pas valide. Seule la devise XOF (27) est acceptée.")
        setShowErrorModal(true)
        return
      }

      // User is valid, show confirmation modal
      setSearchResult(data)
      setShowConfirmModal(true)
    },
    onError: (error: any) => {
      const errorTimeMessage = 
        error?.originalError?.response?.data?.error_time_message ||
        error?.response?.data?.error_time_message
      
      if (errorTimeMessage && Array.isArray(errorTimeMessage) && errorTimeMessage.length > 0) {
        const timeMessage = errorTimeMessage[0]
        toast.error(`Trop de tentatives. Veuillez réessayer dans ${timeMessage}`)
      } else {
        setErrorMessage(error.message || "Erreur lors de la recherche de l'utilisateur")
        setShowErrorModal(true)
      }
    },
  })

  // Populate form when editing
  useEffect(() => {
    if (betIdToEdit && isEditing) {
      setAppId(betIdToEdit.user_app_id)
      setPlatformId(betIdToEdit.app)
    }
  }, [betIdToEdit, isEditing])

  // Add bet ID mutation
  const addBetIdMutation = useMutation({
    mutationFn: async ({ betId, appId }: { betId: string; appId: string }) => {
      const response = await api.post("/mobcash/user-app-id/", {
        user_app_id: betId,
        app_name: appId,
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Identifiant de pari ajouté avec succès!")
      queryClient.invalidateQueries({ queryKey: ["bet-ids"] })

      // If coming from deposit/withdraw page, navigate back with continue parameter
      if (fromPage === "deposit" || fromPage === "withdraw") {
        router.push(`/${fromPage}?continue=true`)
        return
      }

      // Default behavior - stay on page and reset form
      setAppId("")
      setSearchResult(null)
      setPendingBetId(null)
      setShowConfirmModal(false)
    },
    onError: (error: any) => {
      // Handle field-specific errors (400 status)
      if (error?.originalError?.response?.status === 400) {
        const errorData = error.originalError.response.data
        let errorMsg = "Erreur lors de l'ajout de l'identifiant"
        
        // Parse field errors
        if (typeof errorData === 'object') {
          // Check for details field first
          if (errorData.details) {
            errorMsg = errorData.details
          } else {
            const fieldErrors = Object.entries(errorData)
              .map(([field, messages]) => {
                const msgArray = Array.isArray(messages) ? messages : [messages]
                return `${field}: ${msgArray.join(', ')}`
              })
              .join('\n')
            
            if (fieldErrors) {
              errorMsg = fieldErrors
            } else if (errorData.detail || errorData.message || errorData.error) {
              errorMsg = errorData.detail || errorData.message || errorData.error
            }
          }
        }
        
        toast.error(errorMsg)
      } else {
        toast.error(error.message || "Erreur lors de l'ajout de l'identifiant")
      }
    },
  })

  // Update bet ID mutation
  const updateBetIdMutation = useMutation({
    mutationFn: async ({ id, betId, appId }: { id: string; betId: string; appId: string }) => {
      const response = await api.put(`/mobcash/user-app-id/${id}/`, {
        user_app_id: betId,
        app_name: appId,
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Identifiant de pari mis à jour avec succès!")
      queryClient.invalidateQueries({ queryKey: ["bet-ids"] })

      // If coming from deposit/withdraw page, navigate back with continue parameter
      if (fromPage === "deposit" || fromPage === "withdraw") {
        router.push(`/${fromPage}?continue=true`)
        return
      }

      // Default behavior - stay on page and reset form
      setAppId("")
      setSearchResult(null)
      setPendingBetId(null)
      setShowConfirmModal(false)
    },
    onError: (error: any) => {
      // Handle field-specific errors (400 status)
      if (error?.originalError?.response?.status === 400) {
        const errorData = error.originalError.response.data
        let errorMsg = "Erreur lors de la mise à jour de l'identifiant"

        // Parse field errors
        if (typeof errorData === 'object') {
          // Check for details field first
          if (errorData.details) {
            errorMsg = errorData.details
          } else {
            const fieldErrors = Object.entries(errorData)
              .map(([field, messages]) => {
                const msgArray = Array.isArray(messages) ? messages : [messages]
                return `${field}: ${msgArray.join(', ')}`
              })
              .join('\n')

            if (fieldErrors) {
              errorMsg = fieldErrors
            } else if (errorData.detail || errorData.message || errorData.error) {
              errorMsg = errorData.detail || errorData.message || errorData.error
            }
          }
        }

        toast.error(errorMsg)
      } else {
        toast.error(error.message || "Erreur lors de la mise à jour de l'identifiant")
      }
    },
  })

  const handleSearch = () => {
    if (!appId || appId.length < 3) {
      toast.error("Veuillez saisir un identifiant valide")
      return
    }

    if (!platformId) {
      toast.error("Veuillez sélectionner une plateforme")
      return
    }

    searchUserMutation.mutate({ appId: platformId, betId: appId })
  }

  const handleConfirmAdd = (betIdParam?: string, appIdParam?: string) => {
    const finalBetId = betIdParam || pendingBetId?.betId || appId
    const finalAppId = appIdParam || pendingBetId?.appId || platformId
    
    if (!finalBetId || !finalAppId) return
    
    if (isEditing && editId) {
      updateBetIdMutation.mutate({
        id: editId,
        betId: finalBetId,
        appId: finalAppId,
      })
    } else {
    addBetIdMutation.mutate({
      betId: finalBetId,
      appId: finalAppId,
    })
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    handleSearch()
  }

  return (
    <div className="min-h-screen bg-background dark:bg-background">
      {/* Header */}
      <header className="bg-card/80 dark:bg-card/80 backdrop-blur-xl border-b border-border/50 sticky top-0 z-50 safe-area-top shadow-sm">
        <div className="px-5 py-4">
          <div className="flex items-center gap-3">
            <button
              className="h-11 w-11 rounded-2xl bg-card dark:bg-card border border-border/50 dark:border-border shadow-sm hover:shadow-md transition-all duration-200 active:scale-95 flex items-center justify-center"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary/80 via-accent/80 to-primary/80 bg-clip-text text-transparent">
              {isEditing ? "Modifier l'identifiant de pari" : t("addBetId")}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 pb-8 safe-area-bottom">
        <div className="bg-card dark:bg-card rounded-3xl border border-border/50 dark:border-border overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="px-5 py-4 bg-card dark:bg-card border-b border-border/50 dark:border-border/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? "Modifier l'identifiant de pari" : "Ajouter un identifiant de pari"}
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
              {isEditing ? "Modifiez votre ID de compte de la plateforme de paris" : "Ajoutez votre ID de compte de la plateforme de paris"}
            </p>
          </div>
          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="platform">{t("platform")}</Label>
                {loadingPlatforms ? (
                  <div className="text-sm text-muted-foreground">{t("loading")}</div>
                ) : (
                  <Select value={platformId} onValueChange={setPlatformId}>
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
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="appId">Identifiant de pari</Label>
                <div className="flex gap-2">
                  <Input
                    id="appId"
                    type="text"
                    placeholder="123456789"
                    value={appId}
                    onChange={(e) => setAppId(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleSearch}
                    disabled={searchUserMutation.isPending || !appId || !platformId}
                    className="h-10 px-4 bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                  >
                    <Search className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Recherchez votre ID de compte pour valider avant de l'ajouter
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-2xl bg-gradient-to-br from-primary to-accent text-white active:scale-[0.98] transition-all duration-200 font-bold text-sm disabled:opacity-50 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                disabled={searchUserMutation.isPending || loadingBetIdToEdit}
              >
                {searchUserMutation.isPending ? t("loading") : "Rechercher"}
              </button>
            </form>
          </div>
        </div>

        {/* Saved Bet IDs Section */}
        {platformId && (
          <div className="bg-card dark:bg-card rounded-3xl border border-border/50 dark:border-border overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 mt-5">
            <div className="px-5 py-4 bg-card dark:bg-card border-b border-border/50 dark:border-border/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Identifiants sauvegardés</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                Vos identifiants de pari pour cette plateforme
              </p>
            </div>
            <div className="p-5">
              {loadingSavedBetIds ? (
                <div className="text-center py-8 text-muted-foreground">
                  <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-current border-r-transparent mb-2"></div>
                  <p className="text-sm">{t("loading")}</p>
                </div>
              ) : !savedBetIds || savedBetIds.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-sm">Aucun identifiant sauvegardé</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {savedBetIds.map((betId) => (
                    <div
                      key={betId.id}
                    className="p-4 rounded-2xl border-2 border-border/50 dark:border-border bg-card dark:bg-card"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100">{betId.user_app_id}</p>
                          <p className="text-sm text-slate-600 dark:text-slate-400 font-medium mt-0.5">ID de pari</p>
                        </div>
                        <div className="bg-gradient-to-br from-primary to-accent rounded-full p-1.5">
                          <Check className="h-4 w-4 text-white" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Error Modal */}
      <Dialog open={showErrorModal} onOpenChange={setShowErrorModal}>
        <DialogContent className="bg-card dark:bg-card">
          <DialogHeader>
            <DialogTitle className="text-red-600 dark:text-red-400">Erreur</DialogTitle>
            <DialogDescription>{errorMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowErrorModal(false)}
              className="flex-1"
            >
              Fermer
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Modal */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="bg-card dark:bg-card border border-border/50">
          <DialogHeader>
            <DialogTitle className="text-emerald-700 dark:text-emerald-300">
              {isEditing ? "Confirmer la modification" : "Confirmer l'ajout"}
            </DialogTitle>
            <DialogDescription className="text-slate-700 dark:text-slate-300">
              {searchResult && (
                <div className="space-y-2 mt-2">
                  <p><strong>Nom:</strong> {searchResult.Name}</p>
                  <p><strong>ID de pari:</strong> {appId}</p>
                  <p><strong>Devise:</strong> XOF (27)</p>
                </div>
              )}
              <p className="mt-4">
                Voulez-vous {isEditing ? "modifier" : "ajouter"} cet identifiant de pari?
              </p>
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-4 pt-4">
            <Button
              variant="outline"
              onClick={() => {
                setShowConfirmModal(false)
                setSearchResult(null)
              }}
              className="flex-1"
            >
              Annuler
            </Button>
            <Button
              onClick={() => {
                handleConfirmAdd(appId, platformId)
              }}
              disabled={addBetIdMutation.isPending || updateBetIdMutation.isPending}
              className="flex-1 bg-gradient-to-br from-primary to-accent text-white shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
            >
              {(addBetIdMutation.isPending || updateBetIdMutation.isPending) ? t("loading") : "Confirmer"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AddBetIdPage() {
  return (
    <AuthGuard>
      <AddBetIdContent />
    </AuthGuard>
  )
}
