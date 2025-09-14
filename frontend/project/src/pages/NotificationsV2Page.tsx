import React from 'react';
import { BellRing, Trash2, Check, Filter } from 'lucide-react';
import { NotificationItem, NotificationItemData } from '@/components/notifications/NotificationItem';
import { Button } from '@/components/ui/button';

// Mock data for now; could be wired to backend/store later
const initialData: NotificationItemData[] = [
  {
    id: '1',
    title: 'Position opened on BTC/USDT',
    description: 'A long position has been opened with 2x leverage at 65,240 USDT.',
    timestamp: new Date(Date.now() - 2 * 60 * 1000).toISOString(),
    type: 'success',
    read: false,
  },
  {
    id: '2',
    title: 'Partial close executed',
    description: '50% of your ETH position has been closed to secure profits.',
    timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
    type: 'info',
    read: false,
  },
  {
    id: '3',
    title: 'Stop loss hit on SOL',
    description: 'Your stop loss was triggered for SOL/USDT due to volatility.',
    timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    type: 'warning',
    read: true,
  },
];

export function NotificationsV2Page() {
  const [items, setItems] = React.useState<NotificationItemData[]>(initialData);
  const [filter, setFilter] = React.useState<'all' | 'unread'>('all');

  const filtered = React.useMemo(() => {
    return filter === 'all' ? items : items.filter(i => !i.read);
  }, [items, filter]);

  const toggleRead = (id: string) => {
    setItems(prev => prev.map(i => (i.id === id ? { ...i, read: !i.read } : i)));
  };

  const dismiss = (id: string) => {
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const markAllRead = () => {
    setItems(prev => prev.map(i => ({ ...i, read: true })));
  };

  const clearAll = () => {
    setItems([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Notifications</h1>
          <p className="text-slate-400 text-sm">Trade alerts and important updates</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className={`h-9 ${filter === 'all' ? 'border-emerald-500/40 text-emerald-300' : ''}`}
            onClick={() => setFilter('all')}
          >
            <Filter className="w-4 h-4 mr-2" /> All
          </Button>
          <Button
            variant="outline"
            className={`h-9 ${filter === 'unread' ? 'border-emerald-500/40 text-emerald-300' : ''}`}
            onClick={() => setFilter('unread')}
          >
            <BellRing className="w-4 h-4 mr-2" /> Unread
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <Button variant="ghost" className="text-slate-300 hover:text-white" onClick={markAllRead}>
          <Check className="w-4 h-4 mr-2" /> Mark all read
        </Button>
        <Button variant="ghost" className="text-red-400 hover:text-red-300" onClick={clearAll}>
          <Trash2 className="w-4 h-4 mr-2" /> Clear all
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-xl border border-slate-700/60 bg-slate-900/70 p-8 text-center">
          <p className="text-slate-400">No notifications{filter === 'unread' ? ' (unread)' : ''}.</p>
        </div>
      ) : (
        <div className="space-y-3" role="list">
          {filtered.map(item => (
            <NotificationItem key={item.id} item={item} onToggleRead={toggleRead} onDismiss={dismiss} />
          ))}
        </div>
      )}
    </div>
  );
}

export default NotificationsV2Page;
