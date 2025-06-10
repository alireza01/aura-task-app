import React, { useState, useEffect } from 'react'; // Added useState, useEffect
import AdminApiKeyManager from './admin-api-key-manager';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Briefcase, Users, Info, ExternalLink } from 'lucide-react';

// Define AdminStats interface locally
interface AdminStats {
  totalRegisteredUsers: number;
  totalGuestAccounts: number;
  newSignUps24h: number;
  aiApiCalls24h: number;
}

const AdminSettingsSection = () => {
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [statsError, setStatsError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAdminStats = async () => {
      setLoadingStats(true);
      setStatsError(null);
      try {
        const response = await fetch('/api/admin/stats');
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `Error: ${response.status}`);
        }
        const data: AdminStats = await response.json();
        setAdminStats(data);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error("Failed to fetch admin stats:", errorMessage);
        setStatsError(errorMessage);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchAdminStats();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-muted-foreground">
          Manage system settings, API keys, and view site statistics.
        </p>
      </div>

      <Separator />

      <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2">
        {/* User Statistics Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="mr-2 h-5 w-5" />
              User Statistics
            </CardTitle>
            <CardDescription>Overview of user activity and registrations.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingStats ? (
              <p className="text-sm text-muted-foreground">Loading statistics...</p>
            ) : statsError ? (
              <p className="text-sm text-destructive">Failed to load statistics: {statsError}</p>
            ) : adminStats ? (
              <>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Registered Users:</span>
                  <span className="font-semibold">{adminStats.totalRegisteredUsers}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Guest Accounts:</span>
                  <span className="font-semibold">{adminStats.totalGuestAccounts}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">New Sign-ups (24h):</span>
                  <span className="font-semibold">{adminStats.newSignUps24h}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">AI API Calls (24h):</span>
                  <span className="font-semibold">{adminStats.aiApiCalls24h}</span>
                </div>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">No statistics data available.</p>
            )}
          </CardContent>
          <CardFooter>
            <p className="text-xs text-muted-foreground">User statistics are updated periodically.</p>
          </CardFooter>
        </Card>

        {/* System Information Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Info className="mr-2 h-5 w-5" />
              System Information
            </CardTitle>
            <CardDescription>Quick links and system status.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <h4 className="font-medium mb-1">Admin API Keys:</h4>
              <p className="text-sm text-muted-foreground">
                All keys operational (Placeholder - see manager for details).
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-1">External Links:</h4>
              <ul className="list-disc list-inside space-y-1 text-sm">
                <li>
                  <a
                    href="https://supabase.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center"
                  >
                    Supabase Dashboard <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://vercel.com" // Assuming deployed on Vercel, adjust if needed
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center"
                  >
                    Vercel Dashboard <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </li>
                <li>
                  <a
                    href="/docs/admin" // Placeholder link
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline flex items-center"
                  >
                    Admin Documentation (Placeholder) <ExternalLink className="ml-1 h-3 w-3" />
                  </a>
                </li>
              </ul>
            </div>
          </CardContent>
           <CardFooter>
            <p className="text-xs text-muted-foreground">System status is updated in real-time.</p>
          </CardFooter>
        </Card>
      </div>

      {/* API Key Management Section */}
      <div className="space-y-4 pt-6">
        <div className="flex items-center space-x-2">
            <Briefcase className="h-6 w-6" />
            <h2 className="text-2xl font-semibold tracking-tight">Gemini API Key Management</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Manage the pool of admin API keys used for Gemini AI services when user-specific keys are not available or for admin-initiated tasks.
        </p>
        <AdminApiKeyManager />
      </div>

      {/* Other admin settings can be added here later as new cards or sections */}
    </div>
  );
};

export default AdminSettingsSection;
