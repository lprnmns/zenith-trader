import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';
import { Mail, Send, X } from 'lucide-react';

interface UpgradeRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeRequestDialog({ isOpen, onOpenChange }: UpgradeRequestDialogProps) {
  const { user, token } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [email, setEmail] = useState(user?.email || '');
  const [contactInfo, setContactInfo] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !token) {
      toast.error('Authentication error. Please login again.');
      setIsSubmitting(false);
      return;
    }

    if (!email.trim()) {
      toast.error('Please enter your email address.');
      setIsSubmitting(false);
      return;
    }
    
    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:3001'}/auth/upgrade-request`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
        email, 
        contactInfo: contactInfo.trim() || null 
      })
      });

      const data = await response.json();

      if (data.success) {
        toast.success('Success! Your request has been submitted. We will contact you within 3 business days.');
        onOpenChange(false);
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

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Mail className="w-5 h-5 text-emerald-400" />
            Request Upgrade
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Provide your email and contact information to submit a request for premium features.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* E-POSTA ALANI */}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-sm font-medium text-slate-300">
              Email Address *
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Enter your email address"
                className="pl-10 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* İLETİŞİM BİLGİLERİ ALANI */}
          <div className="space-y-2">
            <Label htmlFor="contactInfo" className="text-sm font-medium text-slate-300">
              Contact Information (Optional)
            </Label>
            <div className="relative">
              <Input
                id="contactInfo"
                type="text"
                value={contactInfo}
                onChange={(e) => setContactInfo(e.target.value)}
                placeholder="Phone number, Telegram username, or other contact details"
                className="pl-3 bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-400"
              />
            </div>
            <p className="text-xs text-slate-400">
              Provide additional contact information if you'd like us to reach you through other channels.
            </p>
          </div>

          {/* Butonlar */}
          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1 bg-slate-600 border-slate-500 text-slate-200 hover:bg-slate-700 hover:text-white"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white"
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Submitting...
                </>
              ) : (
                <>
                  <Send className="w-4 h-4 mr-2" />
                  Confirm and Submit Request
                </>
              )}
            </Button>
          </div>
        </form>

        {/* "What happens next?" bölümü */}
        <div className="mt-6 p-4 bg-slate-800/50 rounded-lg border border-slate-700">
          <h4 className="text-sm font-medium text-slate-300 mb-2">What happens next?</h4>
          <ul className="text-xs text-slate-400 space-y-1">
            <li>• We'll review your request within 3 business days</li>
            <li>• You'll receive an email confirmation</li>
            <li>• We'll contact you using the provided information if needed</li>
            <li>• Approved users get full ADMIN access</li>
            <li>• Premium features include strategy creation and automation</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}