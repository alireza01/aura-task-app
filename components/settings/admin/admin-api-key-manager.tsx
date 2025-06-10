'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { PlusCircle, Trash2, KeyRound, Eye, EyeOff, Edit3, AlertTriangle, CheckCircle2 } from 'lucide-react';

// TODO: Define this type properly, perhaps in a shared types file
interface AdminApiKey {
  id: string;
  name: string | null;
  api_key: string; // This will be masked on the client
  is_active: boolean;
  created_at: string;
  last_used_at: string | null;
}

const AdminApiKeyManager = () => {
  const [adminApiKeys, setAdminApiKeys] = useState<AdminApiKey[]>([]);
  const [newApiKeyName, setNewApiKeyName] = useState('');
  const [newApiKeyString, setNewApiKeyString] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingNewKey, setIsSavingNewKey] = useState(false);
  const [isTestingNewKey, setIsTestingNewKey] = useState(false);
  const [newKeyTestResult, setNewKeyTestResult] = useState<'success' | 'error' | null>(null);

  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});

  const fetchAdminApiKeys = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/admin/api-keys');
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch API keys');
      }
      const keys = await response.json();
      setAdminApiKeys(keys);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Fetch Admin API Keys error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAdminApiKeys();
  }, [fetchAdminApiKeys]);

  const maskApiKey = (key: string) => {
    if (!key) return '';
    return `${key.substring(0, 4)}...${key.substring(key.length - 4)}`;
  };

  const toggleShowKey = (keyId: string) => {
    setShowKeyMap(prev => ({ ...prev, [keyId]: !prev[keyId] }));
  };

  const handleTestNewApiKey = async () => {
    if (!newApiKeyString) {
      toast.error('Please enter an API key to test.');
      return;
    }
    setIsTestingNewKey(true);
    setNewKeyTestResult(null);
    try {
      const response = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: newApiKeyString }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setNewKeyTestResult('success');
        toast.success('API Key is valid and working!');
      } else {
        setNewKeyTestResult('error');
        toast.error(result.error || 'Failed to validate API key.');
      }
    } catch (error) {
      setNewKeyTestResult('error');
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred during test.');
      console.error('Test New API Key error:', error);
    } finally {
      setIsTestingNewKey(false);
    }
  };

  const handleAddApiKey = async () => {
    if (!newApiKeyString) {
      toast.error('API key string cannot be empty.');
      return;
    }
    if (newKeyTestResult !== 'success') {
      toast.warning('Please test the API key successfully before saving.');
      // Or, allow saving without test, depending on desired UX
      // return;
    }

    setIsSavingNewKey(true);
    try {
      const response = await fetch('/api/admin/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ api_key: newApiKeyString, name: newApiKeyName || null }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save API key');
      }
      toast.success('New API Key added successfully!');
      setNewApiKeyName('');
      setNewApiKeyString('');
      setNewKeyTestResult(null);
      fetchAdminApiKeys(); // Refresh list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Add API Key error:', error);
    } finally {
      setIsSavingNewKey(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    // Confirmation dialog is part of the JSX
    setIsLoading(true); // Or a specific loading state for the row
    try {
      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete API key');
      }
      toast.success('API Key deleted successfully.');
      fetchAdminApiKeys(); // Refresh list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Delete API Key error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleApiKeyActiveState = async (keyId: string, currentIsActive: boolean) => {
    setIsLoading(true); // Or a specific loading state for the row
    try {
      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentIsActive }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update API key status');
      }
      toast.success(`API Key ${!currentIsActive ? 'activated' : 'deactivated'}.`);
      fetchAdminApiKeys(); // Refresh list
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Toggle API Key Active State error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestExistingApiKey = async (apiKey: string) => {
    if (!apiKey) return;
    const toastId = toast.loading('Testing API key...');
    try {
      const response = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('API Key is valid!', { id: toastId });
      } else {
        toast.error(result.error || 'Failed to validate API key.', { id: toastId });
      }
    } catch (error) {
       toast.error(error instanceof Error ? error.message : 'An unknown error occurred during test.', { id: toastId });
    }
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <KeyRound className="mr-2" /> Admin API Key Management
        </CardTitle>
        <CardDescription>
          Manage API keys that can be used by the system for administrative tasks or special integrations.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Add New API Key</h3>
          <div className="flex flex-col sm:flex-row gap-2 mb-2">
            <Input
              placeholder="Optional: Key Name (e.g., 'Main Admin Key')"
              value={newApiKeyName}
              onChange={(e) => setNewApiKeyName(e.target.value)}
              className="flex-grow"
            />
            <Input
              placeholder="API Key String"
              value={newApiKeyString}
              onChange={(e) => {
                setNewApiKeyString(e.target.value);
                setNewKeyTestResult(null);
              }}
              type="password"
              className="flex-grow"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleTestNewApiKey} disabled={isTestingNewKey || !newApiKeyString} variant="outline">
              {isTestingNewKey ? 'Testing...' : 'Test Key'}
            </Button>
            {newKeyTestResult === 'success' && <CheckCircle2 className="text-green-500" />}
            {newKeyTestResult === 'error' && <AlertTriangle className="text-red-500" />}
            <Button onClick={handleAddApiKey} disabled={isSavingNewKey || !newApiKeyString} className="ml-auto">
              <PlusCircle className="mr-2 h-4 w-4" /> {isSavingNewKey ? 'Saving...' : 'Save New Key'}
            </Button>
          </div>
        </div>

        <h3 className="text-lg font-semibold mb-2">Existing API Keys</h3>
        {isLoading && <p>Loading keys...</p>}
        {!isLoading && adminApiKeys.length === 0 && <p>No admin API keys found.</p>}
        {!isLoading && adminApiKeys.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>API Key</TableHead>
                <TableHead>Active</TableHead>
                <TableHead>Created At</TableHead>
                <TableHead>Last Used</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adminApiKeys.map((key) => (
                <TableRow key={key.id}>
                  <TableCell>{key.name || '-'}</TableCell>
                  <TableCell className="flex items-center">
                    {showKeyMap[key.id] ? key.api_key : maskApiKey(key.api_key)}
                    <Button variant="ghost" size="sm" onClick={() => toggleShowKey(key.id)} className="ml-2">
                      {showKeyMap[key.id] ? <EyeOff size={16} /> : <Eye size={16} />}
                    </Button>
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={key.is_active}
                      onCheckedChange={() => handleToggleApiKeyActiveState(key.id, key.is_active)}
                      // Consider adding disabled state while updating
                    />
                  </TableCell>
                  <TableCell>{new Date(key.created_at).toLocaleDateString()}</TableCell>
                  <TableCell>{key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : '-'}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => handleTestExistingApiKey(key.api_key)}>
                      Test
                    </Button>
                    {/* <Button variant="outline" size="sm" disabled> <Edit3 size={16} className="mr-1" /> Edit </Button> */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm">
                          <Trash2 size={16} className="mr-1" /> Delete
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Are you sure?</DialogTitle>
                          <DialogDescription>
                            This action cannot be undone. This will permanently delete the API key
                            named &quot;{key.name || maskApiKey(key.api_key)}&quot;.
                          </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button variant="outline">Cancel</Button>
                          </DialogClose>
                          <DialogClose asChild>
                            <Button variant="destructive" onClick={() => handleDeleteApiKey(key.id)}>
                              Yes, delete
                            </Button>
                          </DialogClose>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default AdminApiKeyManager;
