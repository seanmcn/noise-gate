import { useState } from 'react';
import {
  ArrowLeft,
  Users,
  Rss,
  Plus,
  Trash2,
  Edit2,
  Loader2,
  Globe,
  EyeOff,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import { Link, Navigate } from 'react-router-dom';
import { SEO } from '@/components/SEO';
import { Header } from '@/components/Header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAdmin } from '@/hooks/useAdmin';
import {
  useSystemSourcesQuery,
  useUserStatsQuery,
  useCreateSystemSourceMutation,
  useUpdateSystemSourceMutation,
  useDeleteSystemSourceMutation,
} from '@/hooks/useAdminQuery';
import type { Source } from '@minfeed/shared';

interface AdminProps {
  signOut: () => void;
}

export function Admin({ signOut }: AdminProps) {
  const { isAdmin, isLoading: isCheckingAdmin } = useAdmin();

  // Source form state
  const [sourceDialogOpen, setSourceDialogOpen] = useState(false);
  const [editingSource, setEditingSource] = useState<Source | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceIsDefault, setSourceIsDefault] = useState(true);

  // Queries
  const { data: sources, isLoading: sourcesLoading } =
    useSystemSourcesQuery(isAdmin);
  const { data: userStats, isLoading: statsLoading } =
    useUserStatsQuery(isAdmin);

  // Mutations
  const createMutation = useCreateSystemSourceMutation();
  const updateMutation = useUpdateSystemSourceMutation();
  const deleteMutation = useDeleteSystemSourceMutation();

  const isSaving =
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending;

  // Redirect non-admins
  if (!isCheckingAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  const openCreateDialog = () => {
    setEditingSource(null);
    setSourceUrl('');
    setSourceName('');
    setSourceIsDefault(true);
    setSourceDialogOpen(true);
  };

  const openEditDialog = (source: Source) => {
    setEditingSource(source);
    setSourceUrl(source.url);
    setSourceName(source.name);
    setSourceIsDefault(source.isDefault ?? true);
    setSourceDialogOpen(true);
  };

  const handleSaveSource = async () => {
    if (!sourceUrl.trim() || !sourceName.trim()) return;

    if (editingSource) {
      await updateMutation.mutateAsync({
        id: editingSource.id,
        updates: { url: sourceUrl.trim(), name: sourceName.trim(), isDefault: sourceIsDefault },
      });
    } else {
      await createMutation.mutateAsync({
        url: sourceUrl.trim(),
        name: sourceName.trim(),
        isDefault: sourceIsDefault,
      });
    }
    setSourceDialogOpen(false);
  };

  const handleToggleActive = (source: Source) => {
    updateMutation.mutate({
      id: source.id,
      updates: { isActive: !source.isActive },
    });
  };

  const handleTogglePublic = (source: Source) => {
    updateMutation.mutate({
      id: source.id,
      updates: { isPublic: !source.isPublic },
    });
  };

  const handleToggleDefault = (source: Source) => {
    updateMutation.mutate({
      id: source.id,
      updates: { isDefault: !(source.isDefault ?? true) },
    });
  };

  const handleDeleteSource = (id: string) => {
    if (confirm('Are you sure you want to delete this source?')) {
      deleteMutation.mutate(id);
    }
  };

  if (isCheckingAdmin || sourcesLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header signOut={signOut} isAuthenticated />
        <div className="container mx-auto px-4 py-16 flex justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SEO title="Admin - MinFeed" />
      <Header signOut={signOut} isAuthenticated />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="font-display text-sm">Back to feed</span>
          </Link>

          <h1 className="font-display text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage system sources and view user statistics
          </p>
        </div>

        <Tabs defaultValue="sources" className="space-y-6">
          <TabsList>
            <TabsTrigger value="sources" className="gap-2">
              <Rss className="w-4 h-4" />
              System Sources
            </TabsTrigger>
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              Users
            </TabsTrigger>
          </TabsList>

          {/* System Sources Tab */}
          <TabsContent value="sources">
            <div className="card-gradient border border-border/50 rounded-lg p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-lg font-semibold text-foreground">
                    System Sources
                  </h2>
                  <p className="text-sm text-muted-foreground">
                    {sources?.length || 0} sources configured
                  </p>
                </div>
                <Button onClick={openCreateDialog} disabled={isSaving}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Source
                </Button>
              </div>

              <div className="border border-border rounded-lg overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead className="hidden md:table-cell">URL</TableHead>
                      <TableHead className="text-center">Active</TableHead>
                      <TableHead className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <Globe className="w-4 h-4" />
                          <span className="hidden sm:inline">Public</span>
                        </span>
                      </TableHead>
                      <TableHead className="text-center">
                        <span className="flex items-center justify-center gap-1">
                          <UserPlus className="w-4 h-4" />
                          <span className="hidden sm:inline">Default</span>
                        </span>
                      </TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(sources || []).map((source) => (
                      <TableRow key={source.id}>
                        <TableCell className="font-medium">
                          {source.name}
                        </TableCell>
                        <TableCell className="hidden md:table-cell max-w-xs truncate text-muted-foreground text-sm">
                          {source.url}
                        </TableCell>
                        <TableCell className="text-center">
                          <Switch
                            checked={source.isActive}
                            onCheckedChange={() => handleToggleActive(source)}
                            disabled={isSaving}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {source.isPublic ? (
                              <Globe className="w-4 h-4 text-primary" />
                            ) : (
                              <EyeOff className="w-4 h-4 text-muted-foreground" />
                            )}
                            <Switch
                              checked={source.isPublic}
                              onCheckedChange={() => handleTogglePublic(source)}
                              disabled={isSaving}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1">
                            {(source.isDefault ?? true) ? (
                              <UserPlus className="w-4 h-4 text-primary" />
                            ) : (
                              <UserMinus className="w-4 h-4 text-muted-foreground" />
                            )}
                            <Switch
                              checked={source.isDefault ?? true}
                              onCheckedChange={() => handleToggleDefault(source)}
                              disabled={isSaving}
                            />
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditDialog(source)}
                              disabled={isSaving}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteSource(source.id)}
                              disabled={isSaving}
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {(!sources || sources.length === 0) && (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="text-center py-8 text-muted-foreground"
                        >
                          No system sources configured. Add one to get started.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users">
            <div className="card-gradient border border-border/50 rounded-lg p-6">
              <div className="mb-6">
                <h2 className="font-display text-lg font-semibold text-foreground">
                  User Statistics
                </h2>
                <p className="text-sm text-muted-foreground">
                  {userStats?.length || 0} users with preferences
                </p>
              </div>

              {statsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>User</TableHead>
                        <TableHead className="text-center">
                          Custom Sources
                        </TableHead>
                        <TableHead className="text-center">
                          Hidden Categories
                        </TableHead>
                        <TableHead className="text-center">
                          Custom Lists
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(userStats || []).map((user) => (
                        <TableRow key={user.userId}>
                          <TableCell className="font-medium text-sm">
                            {user.email}
                          </TableCell>
                          <TableCell className="text-center">
                            {user.customSourceCount}
                          </TableCell>
                          <TableCell className="text-center">
                            {user.hiddenCategoryCount}
                          </TableCell>
                          <TableCell className="text-center">
                            {user.customListCount}
                          </TableCell>
                        </TableRow>
                      ))}
                      {(!userStats || userStats.length === 0) && (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-center py-8 text-muted-foreground"
                          >
                            No user data available.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Source Create/Edit Dialog */}
        <Dialog open={sourceDialogOpen} onOpenChange={setSourceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSource ? 'Edit System Source' : 'Add System Source'}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div>
                <label className="font-display text-sm text-foreground block mb-2">
                  Source Name
                </label>
                <Input
                  value={sourceName}
                  onChange={(e) => setSourceName(e.target.value)}
                  placeholder="e.g., Hacker News"
                  className="bg-secondary/50 border-border font-display text-sm"
                />
              </div>

              <div>
                <label className="font-display text-sm text-foreground block mb-2">
                  RSS Feed URL
                </label>
                <Input
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  placeholder="https://example.com/rss.xml"
                  className="bg-secondary/50 border-border font-display text-sm"
                />
              </div>

              <div className="flex items-center justify-between py-2">
                <div>
                  <label className="font-display text-sm text-foreground block">
                    Auto-subscribe new users
                  </label>
                  <p className="text-xs text-muted-foreground">
                    When enabled, new users will be automatically subscribed to this source
                  </p>
                </div>
                <Switch
                  checked={sourceIsDefault}
                  onCheckedChange={setSourceIsDefault}
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setSourceDialogOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveSource}
                disabled={
                  !sourceUrl.trim() || !sourceName.trim() || isSaving
                }
              >
                {isSaving && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                {editingSource ? 'Save Changes' : 'Add Source'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

export default Admin;
