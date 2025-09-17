import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/authStore';

export function AdminBroadcastPage() {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const { token, user } = useAuthStore();

  const sendBroadcast = async () => {
    if (!title.trim() || !message.trim()) {
      toast.error('Please fill title and message');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL}/notifications/broadcast`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ title, message })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Broadcast failed');
      }
      toast.success(`Broadcast sent to ${data.successCount} users`);
      setTitle('');
      setMessage('');
    } catch (e:any) {
      toast.error(e.message || 'Broadcast failed');
    } finally {
      setLoading(false);
    }
  };

  // Only show to ADMIN
  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="container mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle>Admin Only</CardTitle>
          </CardHeader>
          <CardContent>
            This page is restricted to administrators.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Card>
        <CardHeader>
          <CardTitle>Broadcast Notification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Announcement title" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Your message to all subscribers" rows={6} />
          </div>
          <Button onClick={sendBroadcast} disabled={loading} className="w-full">
            {loading ? 'Sending...' : 'Send to all subscribers'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default AdminBroadcastPage;