"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useTranslation } from "react-i18next"
import { useRouter } from "next/navigation"
import { ArrowLeft, User, Eye, EyeOff, Save, Lock } from "lucide-react"
import toast from "react-hot-toast"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AuthGuard } from "@/components/auth-guard"
import api from "@/lib/api"
import { formatDate } from "@/lib/utils"

interface UserProfile {
  id: string
  bonus_available: number
  is_superuser: boolean
  username: string
  first_name: string
  last_name: string
  email: string
  is_delete: boolean
  phone: string
  otp: string | null
  otp_created_at: string | null
  is_block: boolean
  referrer_code: string | null
  referral_code: string | null
  is_active: boolean
  is_staff: boolean
  is_supperuser: boolean
  date_joined: string
  last_login: string
}

const profileSchema = z.object({
  first_name: z.string().min(1, "Le prénom est requis"),
  last_name: z.string().min(1, "Le nom est requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(10, "Numéro de téléphone invalide"),
})

const changePasswordSchema = z
  .object({
    old_password: z.string().min(1, "L'ancien mot de passe est requis"),
    new_password: z.string().min(6, "Le nouveau mot de passe doit contenir au moins 6 caractères"),
    confirm_new_password: z.string().min(6, "Veuillez confirmer le nouveau mot de passe"),
  })
  .refine((data) => data.new_password === data.confirm_new_password, {
    message: "Les mots de passe ne correspondent pas",
    path: ["confirm_new_password"],
  })

type ProfileFormData = z.infer<typeof profileSchema>
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>

function ProfileContent() {
  const { t } = useTranslation()
  const router = useRouter()
  const queryClient = useQueryClient()
  const [showOldPassword, setShowOldPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Fetch user profile
  const { data: profile, isLoading: loadingProfile } = useQuery<UserProfile>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const response = await api.get("/auth/me")
      return response.data
    },
  })

  // Profile edit form
  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    formState: { errors: profileErrors },
    reset: resetProfile,
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    values: profile
      ? {
          first_name: profile.first_name || "",
          last_name: profile.last_name || "",
          email: profile.email || "",
          phone: profile.phone || "",
        }
      : undefined,
  })

  // Password change form
  const {
    register: registerPassword,
    handleSubmit: handlePasswordSubmit,
    formState: { errors: passwordErrors },
    reset: resetPassword,
  } = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
  })

  // Update profile mutation
  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormData) => {
      const response = await api.put("/auth/edit", data)
      return response.data
    },
    onSuccess: () => {
      toast.success("Profil mis à jour avec succès!")
      queryClient.invalidateQueries({ queryKey: ["user-profile"] })
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors de la mise à jour du profil")
    },
  })

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: async (data: ChangePasswordFormData) => {
      const response = await api.post("/auth/change_password", {
        old_password: data.old_password,
        new_password: data.new_password,
        confirm_new_password: data.confirm_new_password,
      })
      return response.data
    },
    onSuccess: () => {
      toast.success("Mot de passe modifié avec succès!")
      resetPassword()
    },
    onError: (error: any) => {
      toast.error(error.message || "Erreur lors du changement de mot de passe")
    },
  })

  const onProfileSubmit = (data: ProfileFormData) => {
    updateProfileMutation.mutate(data)
  }

  const onPasswordSubmit = (data: ChangePasswordFormData) => {
    changePasswordMutation.mutate(data)
  }

  if (loadingProfile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-[3px] border-solid border-primary border-r-transparent mb-3"></div>
          <p className="text-sm font-semibold">{t("loading")}</p>
        </div>
      </div>
    )
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
              Mon Profil
            </h1>
          </div>
        </div>
      </header>

      <main className="px-5 py-6 space-y-5 pb-8 safe-area-bottom">
        {/* Profile Info Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 dark:from-primary/30 dark:to-accent/30 flex items-center justify-center">
                <User className="h-6 w-6 text-primary dark:text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Informations personnelles</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  Modifiez vos informations de profil
                </p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">{t("firstName")}</Label>
                  <Input
                    id="first_name"
                    type="text"
                    placeholder="John"
                    {...registerProfile("first_name")}
                    disabled={updateProfileMutation.isPending}
                  />
                  {profileErrors.first_name && (
                    <p className="text-sm text-destructive">{profileErrors.first_name.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="last_name">{t("lastName")}</Label>
                  <Input
                    id="last_name"
                    type="text"
                    placeholder="Doe"
                    {...registerProfile("last_name")}
                    disabled={updateProfileMutation.isPending}
                  />
                  {profileErrors.last_name && (
                    <p className="text-sm text-destructive">{profileErrors.last_name.message}</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">{t("email")}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  {...registerProfile("email")}
                  disabled={updateProfileMutation.isPending}
                />
                {profileErrors.email && <p className="text-sm text-destructive">{profileErrors.email.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">{t("phone")}</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="2250700000000"
                  {...registerProfile("phone")}
                  disabled={updateProfileMutation.isPending}
                />
                {profileErrors.phone && <p className="text-sm text-destructive">{profileErrors.phone.message}</p>}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-br from-primary to-accent hover:from-accent hover:to-primary text-white"
                disabled={updateProfileMutation.isPending}
              >
                {updateProfileMutation.isPending ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                    {t("loading")}
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Enregistrer les modifications
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Account Info Card */}
        {profile && (
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
            <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
              <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Informations du compte</h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                Détails de votre compte
              </p>
            </div>
            <div className="p-5 space-y-3">
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Nom d'utilisateur</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{profile.username}</span>
              </div>
              {profile.referral_code && (
                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Code de parrainage</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{profile.referral_code}</span>
                </div>
              )}
              <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Date d'inscription</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {formatDate(profile.date_joined)}
                </span>
              </div>
              {profile.last_login && (
                <div className="flex justify-between items-center py-2">
                  <span className="text-sm text-slate-600 dark:text-slate-400 font-medium">Dernière connexion</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    {formatDate(profile.last_login)}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Change Password Card */}
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/50 dark:border-slate-800/50 overflow-hidden shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50">
          <div className="px-5 py-4 bg-gradient-to-r from-slate-50 to-slate-100/50 dark:from-slate-900 dark:to-slate-800/50 border-b border-slate-200/50 dark:border-slate-800/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-200 dark:from-amber-900/40 dark:to-orange-800/40 flex items-center justify-center">
                <Lock className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Changer le mot de passe</h2>
                <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5 font-medium">
                  Mettez à jour votre mot de passe
                </p>
              </div>
            </div>
          </div>
          <div className="p-5">
            <form onSubmit={handlePasswordSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="old_password">Ancien mot de passe</Label>
                <div className="relative">
                  <Input
                    id="old_password"
                    type={showOldPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pr-10"
                    {...registerPassword("old_password")}
                    disabled={changePasswordMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowOldPassword(!showOldPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showOldPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordErrors.old_password && (
                  <p className="text-sm text-destructive">{passwordErrors.old_password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="new_password">Nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="new_password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pr-10"
                    {...registerPassword("new_password")}
                    disabled={changePasswordMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showNewPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordErrors.new_password && (
                  <p className="text-sm text-destructive">{passwordErrors.new_password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm_new_password">Confirmer le nouveau mot de passe</Label>
                <div className="relative">
                  <Input
                    id="confirm_new_password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pr-10"
                    {...registerPassword("confirm_new_password")}
                    disabled={changePasswordMutation.isPending}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
                {passwordErrors.confirm_new_password && (
                  <p className="text-sm text-destructive">{passwordErrors.confirm_new_password.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-br from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white"
                disabled={changePasswordMutation.isPending}
              >
                {changePasswordMutation.isPending ? (
                  <>
                    <div className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent mr-2"></div>
                    {t("loading")}
                  </>
                ) : (
                  <>
                    <Lock className="h-4 w-4 mr-2" />
                    Changer le mot de passe
                  </>
                )}
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function ProfilePage() {
  return (
    <AuthGuard>
      <ProfileContent />
    </AuthGuard>
  )
}

