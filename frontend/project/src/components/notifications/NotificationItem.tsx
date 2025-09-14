import React from 'react';
import { Bell, CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export type NotificationType = 'success' | 'warning' | 'error' | 'info';

export interface NotificationItemData {
  id: string;
  title: string;
  description: string;
  timestamp: string; // ISO string
  type: NotificationType;
  read: boolean;
}

interface NotificationItemProps {
  item: NotificationItemData;
  onToggleRead: (id: string) => void;
  onDismiss: (id: string) => void;
}

// Format a relative time like "3m ago"
function formatRelativeTime(iso: string) {
  const date = new Date(iso);
  const diff = Date.now() - date.getTime();
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const d = Math.floor(hr / 24);
  return `${d}d ago`;
}

const typeStyles: Record<NotificationType, { icon: React.ReactNode; ring: string; pill: string; bg: string }>
  = {
    success: {
      icon: <CheckCircle2 className="w-4 h-4" />,
      ring: 'ring-emerald-500/30',
      pill: 'bg-emerald-500/15 text-emerald-300',
      bg: 'bg-emerald-500/10'
    },
    warning: {
      icon: <AlertTriangle className="w-4 h-4" />,
      ring: 'ring-amber-500/30',
      pill: 'bg-amber-500/15 text-amber-300',
      bg: 'bg-amber-500/10'
    },
    error: {
      icon: <XCircle className="w-4 h-4" />,
      ring: 'ring-red-500/30',
      pill: 'bg-red-500/15 text-red-300',
      bg: 'bg-red-500/10'
    },
    info: {
      icon: <Info className="w-4 h-4" />,
      ring: 'ring-blue-500/30',
      pill: 'bg-blue-500/15 text-blue-300',
      bg: 'bg-blue-500/10'
    }
  };

export const NotificationItem: React.FC<NotificationItemProps> = ({ item, onToggleRead, onDismiss }) => {
  const [dragX, setDragX] = React.useState(0);
  const [startX, setStartX] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const onPointerDown = (e: React.PointerEvent) => {
    setStartX(e.clientX);
    setIsDragging(true);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!isDragging || startX === null) return;
    const dx = e.clientX - startX;
    // only allow horizontal left swipe visual
    if (Math.abs(dx) < 6) return;
    setDragX(dx);
  };
  const onPointerUp = () => {
    if (!isDragging) return;
    const threshold = 96; // px
    if (Math.abs(dragX) > threshold) {
      onDismiss(item.id);
    }
    setIsDragging(false);
    setStartX(null);
    setDragX(0);
  };

  const t = typeStyles[item.type];

  return (
    <div
      className={`relative rounded-xl border border-slate-700/60 bg-slate-900/70 backdrop-blur px-4 py-3 transition-shadow ${
        item.read ? '' : `ring-1 ${t.ring}`
      }`}
      role="listitem"
    >
      {/* swipe surface */}
      <div
        className="cursor-pointer select-none"
        style={{ transform: `translateX(${dragX}px)`, opacity: dragX !== 0 ? Math.max(0.4, 1 - Math.abs(dragX) / 240) : 1 }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div className="flex items-start gap-3">
          <div className={`mt-0.5 flex h-7 w-7 items-center justify-center rounded-lg ${t.bg}`}>
            {t.icon}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className={`truncate text-sm font-semibold ${item.read ? 'text-slate-300' : 'text-white'}`}>{item.title}</h3>
              {!item.read && <span className={`rounded-full px-2 py-0.5 text-[10px] ${t.pill}`}>NEW</span>}
            </div>
            <p className="mt-0.5 line-clamp-3 text-sm text-slate-400">{item.description}</p>
            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span>{formatRelativeTime(item.timestamp)}</span>
              <button
                onClick={() => onToggleRead(item.id)}
                className="rounded-md border border-slate-600/50 px-2 py-1 text-slate-300 hover:bg-slate-700/40"
              >
                {item.read ? 'Mark as unread' : 'Mark as read'}
              </button>
            </div>
          </div>
          <button
            aria-label="Dismiss notification"
            onClick={() => onDismiss(item.id)}
            className="ml-2 rounded-md p-1 text-slate-400 hover:bg-slate-800/60 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
