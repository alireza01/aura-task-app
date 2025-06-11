'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
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

  // State for editing an existing key
  const [editingKey, setEditingKey] = useState<AdminApiKey | null>(null);
  const [editKeyName, setEditKeyName] = useState('');
  const [editKeyIsActive, setEditKeyIsActive] = useState(false);
  const [isUpdatingKey, setIsUpdatingKey] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [isSavingNewKey, setIsSavingNewKey] = useState(false);
  const [isTestingNewKey, setIsTestingNewKey] = useState(false);
  const [newKeyTestResult, setNewKeyTestResult] = useState<'success' | 'error' | null>(null);

  const [showKeyMap, setShowKeyMap] = useState<Record<string, boolean>>({});
  const toastIdRef = useRef<string | number | undefined>(undefined);


  // Cleanup for the toast potentially created by handleTestExistingApiKey
  useEffect(() => {
    return () => {
      if (toastIdRef.current) {
        toast.dismiss(toastIdRef.current);
        toastIdRef.current = undefined;
      }
    };
  }, []);

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
    // This function can be potentially merged with or called by handleUpdateApiKey
    // For now, let's keep it separate if it's only toggling active state directly from the switch.
    // If Edit dialog also manages active state, then this might need adjustment.
    //setIsLoading(true); // Using isUpdatingKey for specific row actions might be better
    const originalKeys = [...adminApiKeys];
    const updatedKeys = adminApiKeys.map(k => k.id === keyId ? { ...k, is_active: !currentIsActive } : k);
    setAdminApiKeys(updatedKeys); // Optimistic update

    try {
      const response = await fetch(`/api/admin/api-keys/${keyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentIsActive }),
      });
      if (!response.ok) {
        const errorData = await response.json();
        setAdminApiKeys(originalKeys); // Revert optimistic update
        throw new Error(errorData.error || 'Failed to update API key status');
      }
      toast.success(`API Key ${!currentIsActive ? 'activated' : 'deactivated'}.`);
      fetchAdminApiKeys(); // Re-fetch to confirm and get other potential updates
    } catch (error) {
      setAdminApiKeys(originalKeys); // Revert optimistic update
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Toggle API Key Active State error:', error);
    } finally {
      //setIsLoading(false);
    }
  };

  const handleOpenEditDialog = (key: AdminApiKey) => {
    setEditingKey(key);
    setEditKeyName(key.name || '');
    setEditKeyIsActive(key.is_active);
  };

  const handleUpdateApiKey = async () => {
    if (!editingKey) return;

    setIsUpdatingKey(true);
    const originalKeys = [...adminApiKeys];
    // Optimistic update for name and active state
    const updatedKeysOptimistic = adminApiKeys.map(k =>
      k.id === editingKey.id ? { ...k, name: editKeyName, is_active: editKeyIsActive } : k
    );
    setAdminApiKeys(updatedKeysOptimistic);

    try {
      const response = await fetch(`/api/admin/api-keys/${editingKey.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editKeyName, is_active: editKeyIsActive }),
      });
      if (!response.ok) {
        setAdminApiKeys(originalKeys); // Revert optimistic update
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update API key');
      }
      toast.success('API Key updated successfully!');
      fetchAdminApiKeys(); // Re-fetch for consistency
      setEditingKey(null); // Close dialog
    } catch (error) {
      setAdminApiKeys(originalKeys); // Revert optimistic update
      toast.error(error instanceof Error ? error.message : 'An unknown error occurred');
      console.error('Update API Key error:', error);
    } finally {
      setIsUpdatingKey(false);
    }
  };

  const handleTestExistingApiKey = async (apiKey: string) => {
    if (!apiKey) return;
    // Clear any previous toast ID from this specific action
    if (toastIdRef.current) {
      toast.dismiss(toastIdRef.current);
    }
    toastIdRef.current = toast.loading('Testing API key...');
    try {
      const response = await fetch('/api/test-gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success('API Key is valid!', { id: toastIdRef.current });
      } else {
        toast.error(result.error || 'Failed to validate API key.', { id: toastIdRef.current });
      }
    } catch (error) {
       toast.error(error instanceof Error ? error.message : 'An unknown error occurred during test.', { id: toastIdRef.current });
    }
    // It's generally good practice to clear the ref if the toast's lifecycle is fully managed by success/error/dismiss here,
    // but the unmount cleanup is the primary safety net.
    // For this specific case, the toast is updated (not kept loading indefinitely), so auto-clearing ref might not be needed
    // unless another action could pre-emptively dismiss it. The unmount cleanup is the most robust.
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
                    <Dialog open={!!editingKey && editingKey.id === key.id} onOpenChange={(isOpen) => !isOpen && setEditingKey(null)}>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" onClick={() => handleOpenEditDialog(key)}>
                          <Edit3 size={16} className="mr-1" /> Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit API Key</DialogTitle>
                          <DialogDescription>
                            Update the name and active status for API key: {maskApiKey(editingKey?.api_key || '')}
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="edit-key-name" className="text-right">Name</label>
                            <Input
                              id="edit-key-name"
                              value={editKeyName}
                              onChange={(e) => setEditKeyName(e.target.value)}
                              className="col-span-3"
                              placeholder="Optional: Key Name"
                            />
                          </div>
                          <div className="grid grid-cols-4 items-center gap-4">
                            <label htmlFor="edit-key-active" className="text-right">Active</label>
                            <Switch
                              id="edit-key-active"
                              checked={editKeyIsActive}
                              onCheckedChange={setEditKeyIsActive}
                              className="col-span-3"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                             <Button variant="outline" onClick={() => setEditingKey(null)}>Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleUpdateApiKey} disabled={isUpdatingKey}>
                            {isUpdatingKey ? 'Saving...' : 'Save Changes'}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="destructive" size="sm" disabled={isUpdatingKey}>
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
