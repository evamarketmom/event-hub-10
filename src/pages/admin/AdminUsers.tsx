import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable, Column } from '@/components/admin/DataTable';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { MoreHorizontal, Ban, UserCheck, MessageCircleOff, Clock, Trash2, Eye, Cake } from 'lucide-react';
import { formatDistanceToNow, format, differenceInYears } from 'date-fns';
import { useAuth } from '@/contexts/AuthContext';

interface User {
  id: string;
  full_name: string | null;
  username: string | null;
  email?: string;
  avatar_url: string | null;
  location: string | null;
  is_online: boolean | null;
  is_blocked: boolean | null;
  chat_disabled: boolean | null;
  created_at: string | null;
  last_seen: string | null;
  date_of_birth: string | null;
}

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialog, setActionDialog] = useState<'block' | 'suspend' | 'delete' | null>(null);
  const [suspensionDays, setSuspensionDays] = useState('7');
  const [actionReason, setActionReason] = useState('');

  const { data: users = [], isLoading } = useQuery({
    queryKey: ['admin-users'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as User[];
    },
  });

  const blockMutation = useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ 
          is_blocked: block,
          blocked_at: block ? new Date().toISOString() : null,
          blocked_by: block ? currentUser?.id : null,
        })
        .eq('id', userId);

      if (error) throw error;

      // Log activity
      await supabase.from('admin_activity_logs').insert({
        admin_id: currentUser?.id,
        action: block ? 'Blocked user' : 'Unblocked user',
        target_type: 'user',
        target_id: userId,
        details: { reason: actionReason },
      });
    },
    onSuccess: (_, { block }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(block ? 'User blocked successfully' : 'User unblocked successfully');
      setActionDialog(null);
      setSelectedUser(null);
      setActionReason('');
    },
    onError: (error) => {
      toast.error('Failed to update user: ' + error.message);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: async ({ userId, days }: { userId: string; days: number }) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + days);

      const { error } = await supabase
        .from('user_suspensions')
        .insert({
          user_id: userId,
          reason: actionReason,
          suspended_by: currentUser?.id,
          expires_at: expiresAt.toISOString(),
        });

      if (error) throw error;

      await supabase.from('admin_activity_logs').insert({
        admin_id: currentUser?.id,
        action: `Suspended user for ${days} days`,
        target_type: 'user',
        target_id: userId,
        details: { reason: actionReason, days },
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success('User suspended successfully');
      setActionDialog(null);
      setSelectedUser(null);
      setActionReason('');
    },
    onError: (error) => {
      toast.error('Failed to suspend user: ' + error.message);
    },
  });

  const toggleChatMutation = useMutation({
    mutationFn: async ({ userId, disable }: { userId: string; disable: boolean }) => {
      const { error } = await supabase
        .from('profiles')
        .update({ chat_disabled: disable })
        .eq('id', userId);

      if (error) throw error;

      await supabase.from('admin_activity_logs').insert({
        admin_id: currentUser?.id,
        action: disable ? 'Disabled chat for user' : 'Enabled chat for user',
        target_type: 'user',
        target_id: userId,
      });
    },
    onSuccess: (_, { disable }) => {
      queryClient.invalidateQueries({ queryKey: ['admin-users'] });
      toast.success(disable ? 'Chat disabled for user' : 'Chat enabled for user');
    },
    onError: (error) => {
      toast.error('Failed to update chat status: ' + error.message);
    },
  });

  const columns: Column<User>[] = [
    {
      key: 'user',
      header: 'User',
      render: (user) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={user.avatar_url || undefined} />
            <AvatarFallback className="bg-primary/10 text-primary">
              {user.full_name?.charAt(0) || 'U'}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-medium">{user.full_name || 'Unknown'}</p>
            <p className="text-sm text-muted-foreground">@{user.username || 'no-username'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'location',
      header: 'Location',
      render: (user) => (
        <span className="text-muted-foreground">{user.location || 'Not specified'}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user) => (
        <div className="flex flex-wrap gap-1">
          {user.is_blocked ? (
            <Badge variant="destructive">Blocked</Badge>
          ) : user.is_online ? (
            <Badge className="bg-green-500">Online</Badge>
          ) : (
            <Badge variant="secondary">Offline</Badge>
          )}
          {user.chat_disabled && (
            <Badge variant="outline" className="text-orange-600 border-orange-600">
              Chat Disabled
            </Badge>
          )}
        </div>
      ),
    },
    {
      key: 'last_seen',
      header: 'Last Active',
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {user.last_seen 
            ? formatDistanceToNow(new Date(user.last_seen), { addSuffix: true })
            : 'Never'}
        </span>
      ),
    },
    {
      key: 'date_of_birth',
      header: 'DOB / Age',
      render: (user) => (
        <div className="flex items-center gap-1 text-sm">
          {user.date_of_birth ? (
            <>
              <Cake className="h-3 w-3 text-muted-foreground" />
              <span>{format(new Date(user.date_of_birth), 'dd MMM yyyy')}</span>
              <span className="text-muted-foreground">
                ({differenceInYears(new Date(), new Date(user.date_of_birth))} yrs)
              </span>
            </>
          ) : (
            <span className="text-muted-foreground">Not provided</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: 'Joined',
      render: (user) => (
        <span className="text-sm text-muted-foreground">
          {user.created_at 
            ? formatDistanceToNow(new Date(user.created_at), { addSuffix: true })
            : 'Unknown'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (user) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => window.open(`/user/${user.id}`, '_blank')}>
              <Eye className="h-4 w-4 mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => toggleChatMutation.mutate({ 
                userId: user.id, 
                disable: !user.chat_disabled 
              })}
            >
              <MessageCircleOff className="h-4 w-4 mr-2" />
              {user.chat_disabled ? 'Enable Chat' : 'Disable Chat'}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => {
                setSelectedUser(user);
                setActionDialog('suspend');
              }}
            >
              <Clock className="h-4 w-4 mr-2" />
              Suspend User
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => {
                setSelectedUser(user);
                setActionDialog('block');
              }}
              className={user.is_blocked ? 'text-green-600' : 'text-destructive'}
            >
              {user.is_blocked ? (
                <>
                  <UserCheck className="h-4 w-4 mr-2" />
                  Unblock User
                </>
              ) : (
                <>
                  <Ban className="h-4 w-4 mr-2" />
                  Block User
                </>
              )}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <AdminLayout 
      title="User Management" 
      description="Manage platform users, block accounts, and handle suspensions"
    >
      <DataTable
        columns={columns}
        data={users}
        searchPlaceholder="Search users by name..."
        searchKey="full_name"
        isLoading={isLoading}
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { value: 'online', label: 'Online' },
              { value: 'blocked', label: 'Blocked' },
              { value: 'chat_disabled', label: 'Chat Disabled' },
            ],
          },
        ]}
      />

      {/* Block/Unblock Dialog */}
      <Dialog open={actionDialog === 'block'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedUser?.is_blocked ? 'Unblock User' : 'Block User'}
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.is_blocked 
                ? 'This will restore access to the platform for this user.'
                : 'This will prevent the user from accessing the platform.'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="text-sm text-muted-foreground">
                {selectedUser?.full_name} (@{selectedUser?.username})
              </p>
            </div>
            {!selectedUser?.is_blocked && (
              <div>
                <Label htmlFor="reason">Reason</Label>
                <Textarea
                  id="reason"
                  placeholder="Enter reason for blocking..."
                  value={actionReason}
                  onChange={(e) => setActionReason(e.target.value)}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant={selectedUser?.is_blocked ? 'default' : 'destructive'}
              onClick={() => selectedUser && blockMutation.mutate({ 
                userId: selectedUser.id, 
                block: !selectedUser.is_blocked 
              })}
              disabled={blockMutation.isPending}
            >
              {selectedUser?.is_blocked ? 'Unblock' : 'Block'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Suspend Dialog */}
      <Dialog open={actionDialog === 'suspend'} onOpenChange={() => setActionDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Suspend User</DialogTitle>
            <DialogDescription>
              Temporarily suspend this user from the platform.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>User</Label>
              <p className="text-sm text-muted-foreground">
                {selectedUser?.full_name} (@{selectedUser?.username})
              </p>
            </div>
            <div>
              <Label htmlFor="days">Suspension Duration (days)</Label>
              <Input
                id="days"
                type="number"
                min="1"
                max="365"
                value={suspensionDays}
                onChange={(e) => setSuspensionDays(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="suspend-reason">Reason</Label>
              <Textarea
                id="suspend-reason"
                placeholder="Enter reason for suspension..."
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialog(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedUser && suspendMutation.mutate({ 
                userId: selectedUser.id, 
                days: parseInt(suspensionDays) || 7
              })}
              disabled={suspendMutation.isPending || !actionReason.trim()}
            >
              Suspend User
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
