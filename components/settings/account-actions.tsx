"use client"

import { useState } from "react"
import { supabase } from "@/lib/supabaseClient"
import type { User } from "@supabase/auth-helpers-nextjs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { UserIcon, LogOut, Trash2 } from "lucide-react"

interface AccountActionsProps {
  user: User
}

export default function AccountActions({ user }: AccountActionsProps) {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSignOut = async () => {
    setLoading(true)

    try {
      await supabase.auth.signOut()
      toast({
        title: "خروج موفقیت‌آمیز",
        description: "شما با موفقیت از حساب کاربری خود خارج شدید.",
      })
    } catch (error) {
      console.error("خطا در خروج از حساب کاربری:", error)
      toast({
        title: "خطا در خروج از حساب کاربری",
        description: "مشکلی در خروج از حساب کاربری رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setShowSignOutDialog(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)

    try {
      // First delete user data
      const { error: dataError } = await supabase.from("user_settings").delete().eq("user_id", user.id)

      if (dataError) throw dataError

      // Then delete the user account
      const { error: authError } = await supabase.auth.admin.deleteUser(user.id)

      if (authError) throw authError

      // Sign out
      await supabase.auth.signOut()

      toast({
        title: "حساب کاربری حذف شد",
        description: "حساب کاربری شما با موفقیت حذف شد.",
      })
    } catch (error) {
      console.error("خطا در حذف حساب کاربری:", error)
      toast({
        title: "خطا در حذف حساب کاربری",
        description: "مشکلی در حذف حساب کاربری رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setShowDeleteAccountDialog(false)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  return (
    <>
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <UserIcon className="h-5 w-5 text-primary" />
            اطلاعات حساب کاربری
          </CardTitle>
          <CardDescription>مدیریت حساب کاربری شما</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={user.user_metadata?.avatar_url || ""}
                alt={user.user_metadata?.full_name || user.email || ""}
              />
              <AvatarFallback className="text-lg">
                {user.user_metadata?.full_name?.[0] || user.email?.[0] || "U"}
              </AvatarFallback>
            </Avatar>
            <div>
              <h3 className="text-lg font-medium">{user.user_metadata?.full_name || "کاربر"}</h3>
              <p className="text-sm text-muted-foreground">{user.email}</p>
              <p className="text-xs text-muted-foreground mt-1">عضو از {formatDate(user.created_at)}</p>
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="outline"
                className="w-full justify-start"
                onClick={() => setShowSignOutDialog(true)}
                disabled={loading}
              >
                <LogOut className="h-4 w-4 ml-2" />
                خروج از حساب کاربری
              </Button>
            </motion.div>

            <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
              <Button
                variant="destructive"
                className="w-full justify-start"
                onClick={() => setShowDeleteAccountDialog(true)}
                disabled={loading}
              >
                <Trash2 className="h-4 w-4 ml-2" />
                حذف حساب کاربری
              </Button>
            </motion.div>
          </div>
        </CardContent>
      </Card>

      {/* Sign Out Confirmation Dialog */}
      <AlertDialog open={showSignOutDialog} onOpenChange={setShowSignOutDialog}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>خروج از حساب کاربری</AlertDialogTitle>
            <AlertDialogDescription>آیا مطمئن هستید که می‌خواهید از حساب کاربری خود خارج شوید؟</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>انصراف</AlertDialogCancel>
            <AlertDialogAction onClick={handleSignOut} disabled={loading}>
              {loading ? "در حال خروج..." : "خروج"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Confirmation Dialog */}
      <AlertDialog open={showDeleteAccountDialog} onOpenChange={setShowDeleteAccountDialog}>
        <AlertDialogContent className="glass-card border-0">
          <AlertDialogHeader>
            <AlertDialogTitle>حذف حساب کاربری</AlertDialogTitle>
            <AlertDialogDescription>
              آیا مطمئن هستید که می‌خواهید حساب کاربری خود را حذف کنید؟ این عمل غیرقابل بازگشت است و تمام داده‌های شما حذف
              خواهد شد.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "در حال حذف..." : "حذف حساب کاربری"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
