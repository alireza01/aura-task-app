"use client"

import { useState, useEffect } from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"
import { signOut, linkGoogleAccount } from "@/lib/auth/actions" // Added linkGoogleAccount
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
import { UserIcon, LogOut, Trash2, Chrome } from "lucide-react" // Added Chrome

// Define a more specific User type for this component's props,
// including properties from your 'profiles' table if needed.
interface ProfiledUser extends User {
  // Assuming is_guest comes from your profiles table or is added to the user object
  is_guest?: boolean;
  user_metadata: { // Ensure user_metadata is explicitly typed
    avatar_url?: string;
    full_name?: string;
    [key: string]: any; // Allow other metadata properties
  };
}

interface AccountActionsProps {
  user: ProfiledUser // Use the more specific user type
}

export default function AccountActions({ user }: AccountActionsProps) {
  const [showSignOutDialog, setShowSignOutDialog] = useState(false)
  const [showDeleteAccountDialog, setShowDeleteAccountDialog] = useState(false)
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()
  const supabaseClient = createClient()
  const router = useRouter()

  const handleSignOutSubmit = async () => { // Renamed from handleSignOut
    setLoading(true)
    try {
      // This function is now primarily for the dialog confirmation.
      // The actual sign-out is a server action.
      await signOut(router) // Assuming signOut still takes router for navigation post-action
      toast({
        title: "خروج موفقیت‌آمیز",
        description: "شما با موفقیت از حساب کاربری خود خارج شدید.",
      })
    } catch (error: any) {
      console.error("Error signing out:", error)
      toast({
        title: "خطا در خروج از حساب کاربری",
        description: error.message || "مشکلی در خروج از حساب کاربری رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setShowSignOutDialog(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!supabaseClient) return
    setLoading(true)

    try {
      // First delete user data from 'user_settings'
      const { error: dataError } = await supabaseClient.from("user_settings").delete().eq("user_id", user.id)
      if (dataError) throw dataError

      console.warn(
        "User data deletion from 'user_settings' attempted. Actual user account deletion from Supabase Auth should be a secure server-side function using a service_role key.",
      )
      // const { error: authError } = await supabaseClient.auth.admin.deleteUser(user.id) // Needs admin rights, move to server
      // if (authError) throw authError

      // For now, just signing out locally after attempting to delete data.
      // The user will be signed out, but their auth entry might still exist.
      await supabaseClient.auth.signOut()
      router.refresh() // Refresh to update UI state, redirect to home or login might be better.

      toast({
        title: "اطلاعات کاربری محلی حذف شد",
        description: "اطلاعات کاربری شما از این دستگاه حذف شد. برای حذف کامل حساب، با پشتیبانی تماس بگیرید.",
      })
    } catch (error: any) {
      console.error("خطا در حذف حساب کاربری:", error)
      toast({
        title: "خطا در حذف حساب کاربری",
        description: error.message || "مشکلی در حذف حساب کاربری رخ داد. لطفاً دوباره تلاش کنید.",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
      setShowDeleteAccountDialog(false)
    }
  }

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "تاریخ نامشخص";
    const date = new Date(dateString)
    return date.toLocaleDateString("fa-IR", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  }

  // Conditional rendering for Guest User
  if (user.is_guest) {
    return (
      <Card className="glass-card border-0">
        <CardHeader>
          <CardTitle>حساب کاربری مهمان</CardTitle>
          <CardDescription>
            شما در حال حاضر از یک حساب کاربری مهمان استفاده می‌کنید. برای ذخیره دائمی اطلاعات و دسترسی به تمام امکانات، حساب خود را با گوگل پیوند دهید.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={linkGoogleAccount}>
            <Button type="submit" className="w-full" disabled={loading}>
              <Chrome className="ml-2 h-4 w-4" /> {/* Adjusted icon margin for RTL */}
              پیوند با حساب گوگل
            </Button>
          </form>
          {/* A loading state specifically for this form could be added if desired */}
          {/* For example, using a local state like [isLinking, setIsLinking] */}
          {/* and setting it within a try/finally block if linkGoogleAccount was called here directly */}
          {/* However, with server actions, Next.js handles form submission states. */}
        </CardContent>
      </Card>
    );
  }

  // Default view for registered users
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
                onClick={() => setShowSignOutDialog(true)} // Opens dialog
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
                onClick={() => setShowDeleteAccountDialog(true)} // Opens dialog
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
            <AlertDialogAction onClick={handleSignOutSubmit} disabled={loading}>
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
              آیا مطمئن هستید که می‌خواهید اطلاعات کاربری خود را از این دستگاه حذف کنید؟ برای حذف کامل حساب، با پشتیبانی تماس بگیرید.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteAccount}
              disabled={loading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {loading ? "در حال حذف..." : "حذف اطلاعات"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
