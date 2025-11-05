"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import type { Network } from "@/lib/types"

function AddPhoneContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  const [phone, setPhone] = useState("")
  const [networkId, setNetworkId] = useState<string>("")

  // Get network from URL params
  const preselectedNetworkId = searchParams.get("network")

  // Fetch networks
  const { data: networks, isLoading: loadingNetworks } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => {
      const response = await api.get<Network[]>("/mobcash/network")
      return response.data.filter((n) => n.active_for_deposit)
    },
  })

  // Set preselected network when networks are loaded
  useEffect(() => {
    if (preselectedNetworkId && networks && !networkId) {
      setNetworkId(preselectedNetworkId)
    }
  }, [preselectedNetworkId, networks, networkId])

  // Add phone mutation
  const addPhoneMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/mobcash/user-phone/", {
        phone,
        network: Number(networkId),
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Numéro de téléphone ajouté avec succès!")
      queryClient.invalidateQueries({ queryKey: ["phones"] })
      router.back()
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout du numéro")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone || phone.length < 10) {
      toast.error("Veuillez saisir un numéro de téléphone valide")
      return
    }

    if (!networkId) {
      toast.error("Veuillez sélectionner un réseau")
      return
    }

    addPhoneMutation.mutate()
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
            <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 via-emerald-500 to-emerald-600 bg-clip-text text-transparent">{t("addPhone")}</h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 pb-8 safe-area-bottom">
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Ajouter un numéro de téléphone</h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
              {preselectedNetworkId 
                ? `Ajoutez un nouveau numéro pour ${networks?.find(n => n.id.toString() === preselectedNetworkId)?.public_name || 'le réseau sélectionné'}`
                : "Ajoutez un nouveau numéro pour vos transactions"
              }
            </p>
          </div>
          <div className="p-5">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="network">{t("network")}</Label>
                {loadingNetworks ? (
                  <div className="text-sm text-muted-foreground">{t("loading")}</div>
                ) : preselectedNetworkId ? (
                  <div className="p-3 border rounded-md bg-muted">
                    <div className="flex items-center gap-2">
                      <img
                        src={networks?.find(n => n.id.toString() === preselectedNetworkId)?.image || "/placeholder.svg"}
                        alt={networks?.find(n => n.id.toString() === preselectedNetworkId)?.name}
                        className="w-6 h-6 object-contain"
                      />
                      <span className="font-medium">
                        {networks?.find(n => n.id.toString() === preselectedNetworkId)?.public_name}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Réseau présélectionné</p>
                  </div>
                ) : (
                  <Select value={networkId} onValueChange={setNetworkId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Sélectionner un réseau" />
                    </SelectTrigger>
                    <SelectContent>
                      {networks?.map((network) => (
                        <SelectItem key={network.id} value={network.id.toString()}>
                          <div className="flex items-center gap-2">
                            <img
                              src={network.image || "/placeholder.svg"}
                              alt={network.name}
                              className="w-6 h-6 object-contain"
                            />
                            {network.public_name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder={networks?.find((n) => n.id.toString() === networkId)?.placeholder || "2250700000000"}
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Format: {networks?.find((n) => n.id.toString() === networkId)?.indication || "225"} + numéro
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white hover:from-emerald-600 hover:to-emerald-700 dark:hover:from-emerald-700 dark:hover:to-emerald-800 active:scale-[0.98] transition-all duration-200 font-bold text-sm disabled:opacity-50 shadow-lg shadow-emerald-500/30 hover:shadow-xl hover:shadow-emerald-500/40"
                disabled={addPhoneMutation.isPending}
              >
                {addPhoneMutation.isPending ? t("loading") : "Ajouter"}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function AddPhonePage() {
  return (
    <AuthGuard>
      <AddPhoneContent />
    </AuthGuard>
  )
}
