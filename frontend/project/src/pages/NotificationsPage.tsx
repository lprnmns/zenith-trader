import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Bell, BellOff, BellRing, Trash2, ExternalLink, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface NotificationSubscription {
  id: string;
  walletAddress: string;
  isActive: boolean;
  createdAt: string;
  lastNotification?: string;
  notificationCount?: number;
}

export function NotificationsPage() {
  const { user, token } = useAuthStore();
  const [subscriptions, setSubscriptions] = useState<NotificationSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRemoving, setIsRemoving] = useState<string | null>(null);

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    if (!user || !token) return;

    try {
      setIsLoading(true);
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/subscriptions`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubscriptions(data.subscriptions || []);
      } else {
        console.error('Failed to fetch notifications');
        toast.error('Failed to load notification subscriptions');
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      toast.error('Failed to load notification subscriptions');
    } finally {
      setIsLoading(false);
    }
  };

  const removeSubscription = async (walletAddress: string) => {
    if (!user || !token) return;

    try {
      setIsRemoving(walletAddress);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ walletAddress })
      });

      if (response.ok) {
        setSubscriptions(prev => prev.filter(sub => sub.walletAddress !== walletAddress));
        toast.success(`?? Notifications disabled for ${walletAddress.slice(0, 6)}...${walletAddress.slice(-4)}`);
      } else {
        toast.error('Failed to remove subscription');
      }
    } catch (error) {
      console.error('Error removing subscription:', error);
      toast.error('Failed to remove subscription');
    } finally {
      setIsRemoving(null);
    }
  };

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const openWalletExplorer = (walletAddress: string) => {
    window.open(`/explorer?wallet=${encodeURIComponent(walletAddress)}`, '_blank');
  };

  if (isLoading) {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
          <p className="text-slate-400">Manage your wallet notification subscriptions</p>
        </div>

        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 animate-pulse">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="h-4 bg-slate-700 rounded w-32"></div>
                    <div className="h-3 bg-slate-700 rounded w-24"></div>
                  </div>
                  <div className="h-8 bg-slate-700 rounded w-20"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Notifications</h1>
        <p className="text-slate-400">
          Manage your wallet notification subscriptions. You'll receive alerts when monitored wallets make new trades.
        </p>
      </div>

      {subscriptions.length === 0 ? (
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
          <CardContent className="p-12">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-slate-700/50 rounded-full flex items-center justify-center mx-auto">
                <BellOff className="w-8 h-8 text-slate-500" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-white">No Active Notifications</h3>
                <p className="text-slate-400 max-w-md mx-auto">
                  You haven't subscribed to any wallet notifications yet. Visit the Wallet Explorer to analyze wallets and enable notifications for interesting traders.
                </p>
              </div>

              <Button 
                onClick={() => window.location.href = '/explorer'}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Go to Wallet Explorer
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">
              Active Subscriptions ({subscriptions.length})
            </h2>
            <Button
              onClick={fetchNotifications}
              variant="outline"
              size="sm"
              className="text-slate-400 hover:text-white"
            >
              Refresh
            </Button>
          </div>

          {subscriptions.map((subscription) => (
            <Card key={subscription.walletAddress} className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 hover:bg-slate-800/70 transition-colors">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex-shrink-0">
                      <div className="w-10 h-10 bg-emerald-500/10 rounded-full flex items-center justify-center">
                        <BellRing className="w-5 h-5 text-emerald-400" />
                      </div>
                    </div>
                    
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-mono text-white font-medium">
                          {formatAddress(subscription.walletAddress)}
                        </span>
                        <Badge 
                          variant="outline" 
                          className={`text-xs ${
                            subscription.isActive 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                              : 'bg-red-500/10 text-red-400 border-red-500/30'
                          }`}
                        >
                          {subscription.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-slate-400">
                        <span>Subscribed {formatDistanceToNow(new Date(subscription.createdAt))} ago</span>
                        {subscription.notificationCount && (
                          <span className="ml-2">• {subscription.notificationCount} notifications sent</span>
                        )}
                      </div>
                      
                      {subscription.lastNotification && (
                        <div className="text-xs text-slate-500">
                          Last notification: {formatDistanceToNow(new Date(subscription.lastNotification))} ago
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      onClick={() => openWalletExplorer(subscription.walletAddress)}
                      variant="outline"
                      size="sm"
                      className="text-slate-400 hover:text-white border-slate-600 hover:border-slate-500"
                    >
                      <ExternalLink className="w-4 h-4 mr-1" />
                      View
                    </Button>
                    
                    <Button
                      onClick={() => removeSubscription(subscription.walletAddress)}
                      disabled={isRemoving === subscription.walletAddress}
                      variant="outline"
                      size="sm"
                      className="text-red-400 hover:text-red-300 border-red-500/30 hover:border-red-500/50 hover:bg-red-500/10"
                    >
                      {isRemoving === subscription.walletAddress ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Instructions Card */}
      <Card className="bg-slate-800/30 backdrop-blur-sm border-slate-700/30">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <Bell className="w-5 h-5 text-emerald-400" />
            How Notifications Work
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-400">
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong className="text-white">Real-time Monitoring:</strong> We monitor your subscribed wallets every minute for new trading activity.
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong className="text-white">Instant Alerts:</strong> Get notified immediately when wallets open new positions or make significant trades.
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong className="text-white">Browser & Push Support:</strong> Receive notifications even when the app is closed (browser dependent).
            </div>
          </div>
          
          <div className="flex items-start space-x-2">
            <div className="w-1.5 h-1.5 bg-amber-400 rounded-full mt-2 flex-shrink-0"></div>
            <div>
              <strong className="text-amber-300">Tip:</strong> Enable notifications in the Wallet Explorer by clicking the notification button next to any wallet analysis.
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
