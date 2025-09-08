import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Mail, MessageSquare, Send, X } from 'lucide-react';

interface UpgradeRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeRequestDialog({ isOpen, onOpenChange }: UpgradeRequestDialogProps) {
  const { user } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: user?.email || '',
    contactInfo: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/api/auth/upgrade-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('auth-token')}`
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Success! Your request has been submitted. We will contact you within 3 business days.');
        onOpenChange(false);
        // Reset form
        setFormData({
          email: user?.email || '',
          contactInfo: '',
          message: ''
        });
      } else {
        toast.error(data.error || 'Failed to submit upgrade request');
      }
    } catch (error) {
      console.error('Upgrade request error:', error);
      toast.error('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-5 h-5 text-emerald-400" />
            Request Upgrade
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Submit a request to upgrade your account and access premium features including automated trading strategies.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-300">
              Email Address
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                placeholder="your@email.com"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="contactInfo" className="text-sm font-medium text-slate-300">
              Contact Information (Optional)
            </Label>
            <div className="relative">
              <MessageSquare className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="contactInfo"
                value={formData.contactInfo}
                onChange={(e) => handleInputChange('contactInfo', e.target.value)}
                className="pl-10 bg-slate-800 border-slate-600 text-white placeholder:text-slate-500"
                placeholder="Discord: username#1234 or Telegram: @username"
              />
            </div>
            <p className="text-xs text-slate-500">
              Provide your Discord or Telegram username for faster communication
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message" className="text-sm font-medium text-slate-300">
              Message (Optional)
            </Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => handleInputChange('message', e.target.value)}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 resize-none"
              placeholder="Tell us why you'd like to upgrade and what features you're most interested in..."
              rows={4}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1 border-slate-600 text-slate-300 hover:bg-slate-800"
              disabled={isSubmitting}
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Submit Request
                </>
              )}
            </Button>
          </div>
        </form>

        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <h4 className="text-sm font-medium text-slate-300 mb-2">What happens next?</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• We'll review your request within 3 business days</li>
            <li>• You'll receive an email confirmation</li>
            <li>• Approved users get full ADMIN access</li>
            <li>• Premium features include strategy creation and automation</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}