"use client"

import React, { useEffect, useState } from 'react';
import type { User as SupabaseUser, UserAttributes } from '@supabase/supabase-js'; // UserAttributes for guest type
import type { UserSettings, GuestUser } from '@/types';

import { useSettingsStore } from '@/stores/settingsStore';
import { useUIStore } from '@/stores/uiStore';

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter, SheetClose } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input'; // For API Key display/edit
import { Slider } from '@/components/ui/slider'; // For weights
import { useToast } from '@/components/ui/use-toast';
import ThemeSelector from './theme-selector'; // Assuming this is self-contained or uses ThemeProvider
import AccountActions from './account-actions'; // For logout, delete account
import ApiKeyManager from './api-key-manager'; // New component to encapsulate API key logic

interface SettingsPanelProps {
  user: (SupabaseUser & { user_metadata?: any }) | GuestUser | null; // Allow SupabaseUser or GuestUser type
  // settings: UserSettings | null; // This prop will be removed, fetched from store - already removed in prompt
  // isOpen: boolean; // This prop will be removed - already removed in prompt
  // onClose: () => void; // This prop will be removed - already removed in prompt
  // onSettingsChange: () => void; // This prop will be removed - already removed in prompt
}

// Determine if the user object is a SupabaseUser (has 'id' and 'app_metadata') or GuestUser (has 'id' but not 'app_metadata')
const isSupabaseUser = (user: any): user is SupabaseUser => {
  return user && typeof user.id === 'string' && typeof user.app_metadata === 'object';
};


export default function SettingsPanel({ user: userProp }: SettingsPanelProps) {
  const { toast } = useToast();

  const {
    isOpen: isSettingsPanelOpen,
    closeSettingsPanel,
    openApiKeySetupModal
  } = useUIStore((state) => ({
    isOpen: state.isSettingsPanelOpen,
    closeSettingsPanel: state.closeSettingsPanel,
    openApiKeySetupModal: state.openApiKeySetupModal,
  }));

  const {
    userSettings,
    fetchSettings,
    updateSettings,
    isLoadingSettings,
    isUpdatingSettings,
    errorLoadingSettings,
    errorUpdatingSettings
  } = useSettingsStore((state) => ({
    userSettings: state.userSettings,
    fetchSettings: state.fetchSettings,
    updateSettings: state.updateSettings,
    isLoadingSettings: state.isLoadingSettings,
    isUpdatingSettings: state.isUpdatingSettings,
    errorLoadingSettings: state.errorLoadingSettings,
    errorUpdatingSettings: state.errorUpdatingSettings,
  }));

  // Local state for form fields, initialized from store's userSettings
  const [speedWeight, setSpeedWeight] = useState(userSettings?.speed_weight ?? 50);
  const [importanceWeight, setImportanceWeight] = useState(userSettings?.importance_weight ?? 50);
  // Gemini API key is managed by ApiKeyManager or ApiKeySetupModal

  useEffect(() => {
    if (isSupabaseUser(userProp) && isSettingsPanelOpen) {
      fetchSettings(userProp.id);
    }
  }, [userProp, isSettingsPanelOpen, fetchSettings]);

  useEffect(() => {
    if (userSettings) {
      setSpeedWeight(userSettings.speed_weight ?? 50);
      setImportanceWeight(userSettings.importance_weight ?? 50);
    } else { // Reset to defaults if userSettings become null (e.g. after guest logs in then out, or error)
      setSpeedWeight(50);
      setImportanceWeight(50);
    }
  }, [userSettings]);

  const handleSaveSettings = async () => {
    if (!isSupabaseUser(userProp)) {
      toast({ title: "Cannot save settings for guest users.", variant: "default" });
      return;
    }

    const updates: Partial<UserSettings> = {
      speed_weight: speedWeight,
      importance_weight: importanceWeight,
    };

    const updated = await updateSettings(userProp.id, updates);
    if (updated) {
      toast({ title: "Settings Saved", description: "Your preferences have been updated." });
      // Optionally close panel on save: closeSettingsPanel();
    } else {
      toast({ title: "Error Saving Settings", description: errorUpdatingSettings || "Could not save settings.", variant: "destructive" });
    }
  };

  if (!isSettingsPanelOpen) {
    return null;
  }

  const currentUserId = isSupabaseUser(userProp) ? userProp.id : null;

  return (
    <Sheet open={isSettingsPanelOpen} onOpenChange={(open) => !open && closeSettingsPanel()}>
      <SheetContent className="sm:max-w-md w-full flex flex-col">
        <SheetHeader>
          <SheetTitle>تنظیمات</SheetTitle>
          <SheetDescription>
            تنظیمات حساب کاربری و برنامه خود را مدیریت کنید.
          </SheetDescription>
        </SheetHeader>

        {isLoadingSettings && <div className="flex justify-center items-center h-full"><p>در حال بارگذاری تنظیمات...</p></div>}
        {errorLoadingSettings && <div className="text-red-500 p-4">خطا در بارگذاری تنظیمات: {errorLoadingSettings}</div>}

        {!isLoadingSettings && !errorLoadingSettings && (
          <div className="py-6 space-y-6 overflow-y-auto flex-grow pr-2 custom-scrollbar">
            {isSupabaseUser(userProp) && currentUserId && ( // Ensure currentUserId is also checked for logged-in sections
              <>
                {/* API Key Management Section */}
                <ApiKeyManager
                  userId={currentUserId}
                  currentApiKey={userSettings?.gemini_api_key || null}
                  onOpenApiKeyModal={openApiKeySetupModal}
                />

                {/* AI Behavior Customization Section */}
                <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                  <h4 className="font-semibold text-base">شخصی‌سازی هوش مصنوعی</h4>
                  <div className="space-y-3">
                    <Label htmlFor="speed-weight">وزن سرعت (برای رتبه‌بندی)</Label>
                    <div className="flex items-center gap-3">
                       <Slider
                        id="speed-weight"
                        min={0} max={100} step={10}
                        value={[speedWeight]}
                        onValueChange={(value) => setSpeedWeight(value[0])}
                        className="flex-grow"
                      />
                      <span className="text-sm w-10 text-right">{speedWeight}%</span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label htmlFor="importance-weight">وزن اهمیت (برای رتبه‌بندی)</Label>
                     <div className="flex items-center gap-3">
                        <Slider
                          id="importance-weight"
                          min={0} max={100} step={10}
                          value={[importanceWeight]}
                          onValueChange={(value) => setImportanceWeight(value[0])}
                          className="flex-grow"
                        />
                        <span className="text-sm w-10 text-right">{importanceWeight}%</span>
                    </div>
                  </div>
                   <p className="text-xs text-muted-foreground">
                    مجموع وزن‌ها باید ۱۰۰٪ باشد. این تنظیمات روی رتبه‌بندی خودکار وظایف تاثیر می‌گذارد.
                  </p>
                </div>
              </>
            )}

            {/* Theme Selector Section */}
            <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                <h4 className="font-semibold text-base">ظاهر برنامه</h4>
                <ThemeSelector />
            </div>

            {/* Account Actions Section - only for logged-in users */}
            {isSupabaseUser(userProp) && (
              <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
                 <h4 className="font-semibold text-base">حساب کاربری</h4>
                <AccountActions />
              </div>
            )}
             {/* For Guest Users */}
            {!isSupabaseUser(userProp) && (
                 <div className="text-center p-4 border rounded-lg bg-muted/30">
                    <p className="text-sm text-muted-foreground">
                        برای دسترسی به تنظیمات بیشتر و ذخیره اطلاعات خود، لطفاً وارد شوید یا حساب کاربری جدید ایجاد کنید.
                    </p>
                    <Button className="mt-3" onClick={() => { closeSettingsPanel(); useUIStore.getState().openSignInPromptModal(); }}>
                        ورود / ثبت نام
                    </Button>
                </div>
            )}
          </div>
        )}

        <SheetFooter className="mt-auto pt-6 border-t"> {/* Added border-t for visual separation */}
          <SheetClose asChild>
            <Button type="button" variant="outline">بستن</Button>
          </SheetClose>
          {isSupabaseUser(userProp) && (
            <Button type="button" onClick={handleSaveSettings} disabled={isUpdatingSettings || isLoadingSettings}>
              {isUpdatingSettings && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              ذخیره تغییرات
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
