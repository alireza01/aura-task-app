"use client";

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { createClient } from '@/lib/supabase/client';

interface NicknameSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNickname: string | null | undefined;
  userId: string;
  onNicknameSet: () => void;
}

export default function NicknameSetupModal({
  isOpen,
  onClose,
  currentNickname,
  userId,
  onNicknameSet,
}: NicknameSetupModalProps) {
  const [nickname, setNickname] = useState(currentNickname || "");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const supabase = createClient();

  useEffect(() => {
    // Update nickname in state if the prop changes (e.g. profile reloaded)
    setNickname(currentNickname || "");
  }, [currentNickname]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    if (!nickname.trim()) {
      toast({
        title: "خطا",
        description: "اسم مستعار نمی‌تواند خالی باشد.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }

    // Basic validation for length or characters can be added here
    if (nickname.trim().length < 3) {
       toast({
        title: "خطا",
        description: "اسم مستعار باید حداقل ۳ کاراکتر باشد.",
        variant: "destructive",
      });
      setIsLoading(false);
      return;
    }


    const { error } = await supabase
      .from("user_profiles")
      .update({ nickname: nickname.trim(), has_set_nickname: true })
      .eq("user_id", userId);

    setIsLoading(false);

    if (error) {
      console.error("Error updating nickname:", error);
      toast({
        title: "خطا در ذخیره اسم مستعار",
        description: error.message || "مشکلی در به‌روزرسانی اسم مستعار شما پیش آمد.",
        variant: "destructive",
      });
    } else {
      toast({
        title: "موفقیت‌آمیز",
        description: "اسم مستعار شما با موفقیت ذخیره شد.",
      });
      onNicknameSet(); // Callback to refresh profile/UI
      onClose(); // Close the modal
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>تنظیم اسم مستعار</DialogTitle>
            <DialogDescription>
              یک اسم مستعار برای حساب خود انتخاب کنید. این اسم به دیگران نمایش داده می‌شود.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="nickname" className="text-right col-span-1">
                اسم مستعار
              </Label>
              <Input
                id="nickname"
                value={nickname}
                onChange={(e) => setNickname(e.target.value)}
                className="col-span-3"
                placeholder="مثلا: برنامه‌نویس خلاق"
              />
            </div>
          </div>
          <DialogFooter>
            {/* <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              لغو
            </Button> */}
            {/* Typically, modal close is handled by onOpenChange or an explicit X button.
                If this modal is forced, then a cancel button might not be needed,
                or onClose can be tied to it. For a mandatory setup, skip Cancel.
            */}
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "در حال ذخیره..." : "ذخیره و ادامه"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
