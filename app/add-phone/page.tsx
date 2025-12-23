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
import type { Network, UserPhone } from "@/lib/types"
import { formatPhoneNumberForAPI } from "@/lib/utils"

function AddPhoneContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const searchParams = useSearchParams()

  const [phone, setPhone] = useState("")
  const [networkId, setNetworkId] = useState<string>("")
  const [selectedCountry, setSelectedCountry] = useState<string>("ci") // Côte d'Ivoire as default

  // Country data with codes
  const countries = [
    { code: "ci", name: "Côte d'Ivoire", dialCode: "+225", flag: "🇨🇮" },
    { code: "bf", name: "Burkina Faso", dialCode: "+226", flag: "🇧🇫" },
    { code: "sn", name: "Sénégal", dialCode: "+221", flag: "🇸🇳" },
    { code: "bj", name: "Bénin", dialCode: "+229", flag: "🇧🇯" },
  ]

  // Get network from URL params
  const preselectedNetworkId = searchParams.get("network")
  // Check if we should auto-continue after creation
  const fromPage = searchParams.get("from") // "deposit" or "withdraw"
  // Check if we're editing an existing phone
  const editId = searchParams.get("edit")
  const isEditing = !!editId

  // Fetch networks
  const { data: networks, isLoading: loadingNetworks } = useQuery({
    queryKey: ["networks"],
    queryFn: async () => {
      const response = await api.get<Network[]>("/mobcash/network")
      return response.data.filter((n) => n.active_for_deposit)
    },
  })

  // Fetch phone to edit
  const { data: phoneToEdit, isLoading: loadingPhoneToEdit } = useQuery({
    queryKey: ["phone", editId],
    queryFn: async () => {
      if (!editId) return null
      const response = await api.get<UserPhone>(`/mobcash/user-phone/${editId}`)
      return response.data
    },
    enabled: !!editId,
  })

  // Set preselected network when networks are loaded
  useEffect(() => {
    if (preselectedNetworkId && networks && !networkId) {
      setNetworkId(preselectedNetworkId)
    }
  }, [preselectedNetworkId, networks, networkId])

  // Populate form when editing
  useEffect(() => {
    if (phoneToEdit && isEditing) {
      setNetworkId(phoneToEdit.network.toString())

      const rawPhone = phoneToEdit.phone || ""
      const normalizedPhone = rawPhone.startsWith("+") ? rawPhone : `+${rawPhone}`
      const matchedCountry = countries.find((country) =>
        normalizedPhone.startsWith(country.dialCode),
      )

      if (matchedCountry) {
        setSelectedCountry(matchedCountry.code)
        const localNumber = normalizedPhone.substring(matchedCountry.dialCode.length)
        setPhone(localNumber.replace(/\D/g, ""))
      } else {
        setSelectedCountry("ci")
        setPhone(rawPhone)
      }
    }
  }, [phoneToEdit, isEditing])

  // Add phone mutation
  const addPhoneMutation = useMutation({
    mutationFn: async () => {
      const selectedCountryData = countries.find(c => c.code === selectedCountry)
      const fullPhoneNumber = selectedCountryData ? selectedCountryData.dialCode + phone : phone

      const response = await api.post("/mobcash/user-phone/", {
        phone: formatPhoneNumberForAPI(fullPhoneNumber),
        network: Number(networkId),
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Numéro de téléphone ajouté avec succès!")
      queryClient.invalidateQueries({ queryKey: ["phones"] })

      // If coming from deposit/withdraw page, navigate back with continue parameter
      if (fromPage === "deposit" || fromPage === "withdraw") {
        router.push(`/${fromPage}?continue=true`)
        return
      }

      // Default behavior - go back
      router.back()
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de l'ajout du numéro")
    },
  })

  // Update phone mutation
  const updatePhoneMutation = useMutation({
    mutationFn: async () => {
      const selectedCountryData = countries.find(c => c.code === selectedCountry)
      const fullPhoneNumber = selectedCountryData ? selectedCountryData.dialCode + phone : phone

      const response = await api.put(`/mobcash/user-phone/${editId}/`, {
        phone: formatPhoneNumberForAPI(fullPhoneNumber),
        network: Number(networkId),
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Numéro de téléphone mis à jour avec succès!")
      queryClient.invalidateQueries({ queryKey: ["phones"] })

      // If coming from deposit/withdraw page, navigate back with continue parameter
      if (fromPage === "deposit" || fromPage === "withdraw") {
        router.push(`/${fromPage}?continue=true`)
        return
      }

      // Default behavior - go back
      router.back()
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la mise à jour du numéro")
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!phone || phone.length < 8) {
      toast.error("Veuillez saisir un numéro de téléphone valide (au moins 8 chiffres)")
      return
    }

    if (!networkId) {
      toast.error("Veuillez sélectionner un réseau")
      return
    }

    if (isEditing && editId) {
      updatePhoneMutation.mutate()
    } else {
    addPhoneMutation.mutate()
    }
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
              {isEditing ? "Modifier le numéro de téléphone" : t("addPhone")}
            </h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 pb-8 safe-area-bottom">
        <div className="bg-card dark:bg-card rounded-3xl border border-border/50 dark:border-border overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="px-5 py-4 bg-card dark:bg-card border-b border-border/50 dark:border-border/50">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {isEditing ? "Modifier le numéro de téléphone" : "Ajouter un numéro de téléphone"}
            </h2>
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
                <div className="flex gap-2">
                  <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countries.map((country) => (
                        <SelectItem key={country.code} value={country.code}>
                          <div className="flex items-center gap-2">
                            <span>{country.flag}</span>
                            <span>{country.dialCode}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                <Input
                  id="phone"
                  type="tel"
                    placeholder="0700000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                    className="flex-1"
                />
                </div>
                <p className="text-xs text-muted-foreground">
                  Entrez votre numéro de téléphone local (sans indicatif pays)
                </p>
              </div>

              <button
                type="submit"
                className="w-full h-12 rounded-2xl bg-gradient-to-br from-primary to-accent text-white active:scale-[0.98] transition-all duration-200 font-bold text-sm disabled:opacity-50 shadow-lg shadow-primary/30 hover:shadow-xl hover:shadow-primary/40"
                disabled={addPhoneMutation.isPending || updatePhoneMutation.isPending || loadingPhoneToEdit}
              >
                {(addPhoneMutation.isPending || updatePhoneMutation.isPending) ? t("loading") : (isEditing ? "Modifier" : "Ajouter")}
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
