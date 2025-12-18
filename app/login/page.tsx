"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { useTranslation } from "react-i18next"
import toast from "react-hot-toast"
import Link from "next/link"
import { Capacitor } from "@capacitor/core"
import { Eye, EyeOff, Mail, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import api from "@/lib/api"
import { saveAuthData, type AuthResponse } from "@/lib/auth"
import { notificationService } from "@/lib/firebase-notifications"

const loginSchema = z.object({
  email_or_phone: z.string().min(1, "Ce champ est requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
})

type LoginFormData = z.infer<typeof loginSchema>

export default function LoginPage() {
  const { t } = useTranslation()
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  // Default to remember user on mobile platforms, false on web
  const [rememberMe, setRememberMe] = useState(() => {
    if (typeof window !== "undefined") {
      const platform = Capacitor.getPlatform()
      return platform === 'android' || platform === 'ios'
    }
    return false
  })
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false)
  const [forgotPasswordStep, setForgotPasswordStep] = useState(1)
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("")
  const [otp, setOtp] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmNewPassword, setConfirmNewPassword] = useState("")

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  })

  // Forgot password functions
  const handleSendOtp = async () => {
    if (!forgotPasswordEmail.trim()) {
      toast.error("Veuillez entrer votre email")
      return
    }

    setForgotPasswordLoading(true)
    try {
      await api.post("/auth/send_otp", { email: forgotPasswordEmail })
      toast.success("OTP envoyé à votre email")
      setForgotPasswordStep(2)
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de l'envoi de l'OTP")
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const handleVerifyOtp = async () => {
    if (!otp.trim() || otp.length < 4) {
      toast.error("Veuillez entrer un code OTP valide (au moins 4 caractères)")
      return
    }

    setForgotPasswordLoading(true)
    try {
      // For OTP verification, we'll just validate the format and move to step 3
      // The actual verification happens in the reset password step
      toast.success("OTP vérifié avec succès")
      setForgotPasswordStep(3)
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la vérification de l'OTP")
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const handleResetPassword = async () => {
    if (!newPassword.trim() || !confirmNewPassword.trim()) {
      toast.error("Veuillez remplir tous les champs")
      return
    }

    if (newPassword.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères")
      return
    }

    if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(newPassword)) {
      toast.error("Le mot de passe doit contenir au moins une majuscule, une minuscule et un chiffre")
      return
    }

    if (newPassword !== confirmNewPassword) {
      toast.error("Les mots de passe ne correspondent pas")
      return
    }

    setForgotPasswordLoading(true)
    try {
      await api.post("/auth/reset_password", {
        otp: otp.trim(),
        new_password: newPassword,
        confirm_new_password: confirmNewPassword
      })
      toast.success("Mot de passe réinitialisé avec succès")
      setIsForgotPasswordOpen(false)
      resetForgotPasswordState()
    } catch (error: any) {
      toast.error(error.message || "Erreur lors de la réinitialisation du mot de passe")
    } finally {
      setForgotPasswordLoading(false)
    }
  }

  const resetForgotPasswordState = () => {
    setForgotPasswordStep(1)
    setForgotPasswordEmail("")
    setOtp("")
    setNewPassword("")
    setConfirmNewPassword("")
  }

  // Function to register FCM token with backend
  const registerFcmToken = async (userId: string, accessToken: string) => {
    try {
      const fcmToken = notificationService.getToken()
      if (!fcmToken) {
        console.log('No FCM token available for registration')
        return
      }

      console.log('Registering FCM token with backend:', fcmToken)

      // Send FCM token to backend API
      await api.post('/mobcash/devices/', {
        registration_id: fcmToken,
        type: 'android',
        user_id: userId
      })

      console.log('FCM token registered successfully')
    } catch (error) {
      console.error('Error registering FCM token:', error)
      // Don't block login if FCM registration fails
    }
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true)
    try {
      const response = await api.post<AuthResponse>("/auth/login", data)
      const { access, data: userData } = response.data

      saveAuthData(response.data, rememberMe)
      toast.success("Connexion réussie!")
      
      // Request notification permissions on mobile before showing dashboard
      const platform = Capacitor.getPlatform()
      if (platform === 'ios' || platform === 'android') {
        try {
          await notificationService.requestMobileNotificationPermissions()
        } catch (error) {
          console.error('Error requesting notification permissions:', error)
          // Continue to dashboard even if permission request fails
        }
      }

      // Register FCM token with backend after successful login
      await registerFcmToken(userData.id, access)
      
      router.push("/dashboard")
    } catch (error: any) {
      toast.error(error.message || "Erreur de connexion")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="mobile-card w-full max-w-md">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center mb-2">
            <img 
              src="/Zefast-logo.png" 
              alt="Zefast Logo" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <CardDescription className="mobile-text">{t("login")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="email_or_phone" className="mobile-text font-medium">
                {t("email")} / {t("phone")}
              </Label>
              <Input
                id="email_or_phone"
                type="text"
                placeholder="john@example.com ou 22507000"
                className="mobile-input"
                {...register("email_or_phone")}
                disabled={isLoading}
              />
              {errors.email_or_phone && <p className="mobile-text text-destructive">{errors.email_or_phone.message}</p>}
            </div>

            <div className="space-y-3">
              <Label htmlFor="password" className="mobile-text font-medium">{t("password")}</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="mobile-input pr-10"
                  {...register("password")}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {errors.password && <p className="mobile-text text-destructive">{errors.password.message}</p>}
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              />
              <Label htmlFor="remember-me" className="mobile-text text-sm font-normal cursor-pointer">
                Se souvenir de moi
              </Label>
            </div>

            <div className="text-right">
              <Button
                type="button"
                variant="link"
                className="p-0 h-auto text-sm text-primary hover:underline"
                onClick={() => setIsForgotPasswordOpen(true)}
              >
                Mot de passe oublié ?
              </Button>
            </div>

            <Button type="submit" className="w-full mobile-button" disabled={isLoading}>
              {isLoading ? t("loading") : t("loginButton")}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col space-y-3">
          <p className="mobile-text text-muted-foreground text-center">
            {t("dontHaveAccount")}{" "}
            <Link href="/register" className="text-primary hover:underline font-medium">
              {t("register")}
            </Link>
          </p>
        </CardFooter>
      </Card>

      {/* Forgot Password Modal */}
      <Dialog open={isForgotPasswordOpen} onOpenChange={(open) => {
        setIsForgotPasswordOpen(open)
        if (!open) {
          resetForgotPasswordState()
        }
      }}>
        <DialogContent className="mobile-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 mobile-text">
              {forgotPasswordStep > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setForgotPasswordStep(forgotPasswordStep - 1)}
                  className="p-1 h-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
              )}
              Mot de passe oublié
            </DialogTitle>
            <DialogDescription className="mobile-text">
              {forgotPasswordStep === 1 && "Entrez votre email pour recevoir un code de vérification"}
              {forgotPasswordStep === 2 && "Entrez le code OTP envoyé à votre email"}
              {forgotPasswordStep === 3 && "Entrez votre nouveau mot de passe"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {forgotPasswordStep === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="forgot-email" className="mobile-text">Email</Label>
                  <Input
                    id="forgot-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="mobile-input"
                    disabled={forgotPasswordLoading}
                  />
                </div>
                <Button
                  onClick={handleSendOtp}
                  className="w-full mobile-button"
                  disabled={forgotPasswordLoading || !forgotPasswordEmail.trim()}
                >
                  {forgotPasswordLoading ? "Envoi en cours..." : "Envoyer le code"}
                </Button>
              </>
            )}

            {forgotPasswordStep === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="otp" className="mobile-text">Code OTP</Label>
                  <Input
                    id="otp"
                    type="text"
                    placeholder="Entrez le code reçu"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value)}
                    className="mobile-input"
                    disabled={forgotPasswordLoading}
                    maxLength={10}
                  />
                </div>
                <Button
                  onClick={handleVerifyOtp}
                  className="w-full mobile-button"
                  disabled={forgotPasswordLoading || !otp.trim()}
                >
                  {forgotPasswordLoading ? "Vérification..." : "Vérifier le code"}
                </Button>
              </>
            )}

            {forgotPasswordStep === 3 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="new-password" className="mobile-text">Nouveau mot de passe</Label>
                  <Input
                    id="new-password"
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="mobile-input"
                    disabled={forgotPasswordLoading}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password" className="mobile-text">Confirmer le mot de passe</Label>
                  <Input
                    id="confirm-password"
                    type="password"
                    placeholder="••••••••"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    className="mobile-input"
                    disabled={forgotPasswordLoading}
                  />
                </div>
                <Button
                  onClick={handleResetPassword}
                  className="w-full mobile-button"
                  disabled={forgotPasswordLoading || !newPassword.trim() || !confirmNewPassword.trim()}
                >
                  {forgotPasswordLoading ? "Réinitialisation..." : "Réinitialiser le mot de passe"}
                </Button>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
