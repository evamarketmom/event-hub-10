import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { formatDistanceToNow } from "date-fns";
import { 
  Bell, RefreshCw, Heart, MessageCircle, UserPlus, 
  Users, FileText, Mail, Check, CheckCheck, Trash2
} from "lucide-react";

import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type NotificationData = {
  post_id?: string;
  liker_id?: string;
  comment_id?: string;
  commenter_id?: string;
  follower_id?: string;
  community_id?: string;
  discussion_id?: string;
  poster_id?: string;
  conversation_id?: string;
  message_id?: string;
  sender_id?: string;
};

type NotificationRow = {
  id: string;
  user_id: string | null;
  type: string;
  title: string;
  body: string | null;
  data: NotificationData | null;
  is_read: boolean | null;
  created_at: string;
};

const notificationIcons: Record<string, React.ReactNode> = {
  like: <Heart className="h-5 w-5 text-red-500" />,
  comment: <MessageCircle className="h-5 w-5 text-blue-500" />,
  follow: <UserPlus className="h-5 w-5 text-green-500" />,
  community_discussion: <Users className="h-5 w-5 text-purple-500" />,
  new_post: <FileText className="h-5 w-5 text-orange-500" />,
  message: <Mail className="h-5 w-5 text-primary" />,
};

const notificationBgColors: Record<string, string> = {
  like: "bg-red-100 dark:bg-red-900/30",
  comment: "bg-blue-100 dark:bg-blue-900/30",
  follow: "bg-green-100 dark:bg-green-900/30",
  community_discussion: "bg-purple-100 dark:bg-purple-900/30",
  new_post: "bg-orange-100 dark:bg-orange-900/30",
  message: "bg-primary/10",
};

export default function Notifications() {
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<NotificationRow[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [notificationToDelete, setNotificationToDelete] = useState<string | null>(null);

  const userId = user?.id ?? null;

  const load = useCallback(async () => {
    if (!userId) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("notifications")
      .select("id,user_id,type,title,body,data,is_read,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(50);

    if (error) {
      toast({
        title: "Couldn't load notifications",
        description: error.message,
        variant: "destructive",
      });
      setItems([]);
      setLoading(false);
      return;
    }

    setItems((data ?? []) as NotificationRow[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    if (!authLoading && !userId) {
      setLoading(false);
      setItems([]);
      return;
    }

    if (userId) load();
  }, [authLoading, userId, load]);

  const unreadCount = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  const handleNotificationClick = async (notification: NotificationRow) => {
    // Mark as read
    if (!notification.is_read) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("id", notification.id);
      
      setItems(prev => 
        prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n)
      );
    }

    // Navigate based on type
    const data = notification.data;
    if (!data) return;

    switch (notification.type) {
      case "like":
      case "comment":
      case "new_post":
        if (data.post_id) {
          navigate(`/?post=${data.post_id}`);
        }
        break;
      case "follow":
        if (data.follower_id) {
          navigate(`/user/${data.follower_id}`);
        }
        break;
      case "community_discussion":
        if (data.community_id) {
          navigate(`/community/${data.community_id}`);
        }
        break;
      case "message":
        if (data.conversation_id) {
          navigate(`/messages?conversation=${data.conversation_id}`);
        }
        break;
    }
  };

  const markAllAsRead = async () => {
    if (!userId) return;
    
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    if (error) {
      toast({
        title: "Couldn't mark as read",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setItems(prev => prev.map(n => ({ ...n, is_read: true })));
    toast({ title: "All notifications marked as read" });
  };

  const handleDeleteNotification = async () => {
    if (!notificationToDelete) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("id", notificationToDelete);

    if (error) {
      toast({
        title: "Couldn't delete notification",
        description: error.message,
        variant: "destructive",
      });
    } else {
      setItems(prev => prev.filter(n => n.id !== notificationToDelete));
      toast({ title: "Notification deleted" });
    }

    setDeleteDialogOpen(false);
    setNotificationToDelete(null);
  };

  const clearAllNotifications = async () => {
    if (!userId) return;

    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("user_id", userId);

    if (error) {
      toast({
        title: "Couldn't clear notifications",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    setItems([]);
    toast({ title: "All notifications cleared" });
  };

  return (
    <MainLayout>
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Notifications</h1>
            <p className="text-muted-foreground">
              {userId ? (unreadCount ? `${unreadCount} unread` : "You're all caught up") : "Sign in to see your notifications"}
            </p>
          </div>

          {userId && (
            <div className="flex gap-2 flex-wrap">
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <CheckCheck className="mr-2 h-4 w-4" />
                  Mark all read
                </Button>
              )}
              {items.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearAllNotifications}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Clear all
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
                <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
          )}
          
          {!userId && !authLoading && (
            <Button onClick={() => navigate("/auth")}>Sign in</Button>
          )}
        </header>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full rounded-xl" />
            ))}
          </div>
        ) : !userId ? (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">You're not signed in</p>
                  <p className="text-sm text-muted-foreground">Sign in to receive likes, comments, messages, and more.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : items.length === 0 ? (
          <Card className="border-0 shadow-soft">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center">
                  <Bell className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="space-y-1">
                  <p className="font-semibold text-foreground">No notifications yet</p>
                  <p className="text-sm text-muted-foreground">When someone likes, comments, or follows you, it'll show up here.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <section className="space-y-3" aria-label="Notification list">
            {items.map((n) => (
              <Card 
                key={n.id} 
                className={`border-0 shadow-soft cursor-pointer transition-all hover:shadow-md ${
                  !n.is_read ? 'ring-2 ring-primary/20 bg-primary/5' : ''
                }`}
                onClick={() => handleNotificationClick(n)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-4">
                    <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${
                      notificationBgColors[n.type] || 'bg-muted'
                    }`}>
                      {notificationIcons[n.type] || <Bell className="h-5 w-5 text-muted-foreground" />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            {!n.is_read && (
                              <span className="h-2 w-2 rounded-full bg-primary shrink-0" aria-label="Unread" />
                            )}
                            <p className="font-semibold text-foreground line-clamp-1">{n.title}</p>
                          </div>
                          {n.body && (
                            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{n.body}</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <p className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                          </p>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setNotificationToDelete(n.id);
                              setDeleteDialogOpen(true);
                            }}
                          >
                            <Trash2 className="h-4 w-4 text-muted-foreground" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </section>
        )}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove this notification.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteNotification}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </MainLayout>
  );
}
