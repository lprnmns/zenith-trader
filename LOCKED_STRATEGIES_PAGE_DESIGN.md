# Zenith Trader - Kilitli Stratejiler Sayfası Tasarım Dokümantasyonu

## 📋 Genel Bakış

Bu doküman, Zenith Trader projesindeki kilitli stratejiler sayfasının tasarımını, düzenini ve ilgili tüm dosyalarını detaylı olarak açıklamaktadır. USER rolündeki kullanıcıların stratejiler sayfasına eriştiğinde gördüğü upgrade prompt tasarımıdır.

## 🎨 Tasarım Özellikleri

### Ana Özellikler:
- **Çerçeveli Tasarım**: Tüm içerik belirgin bir kutu içinde
- **Orijinal Dark Theme**: Uygulamanın orijinal koyu tema renk paleti
- **Responsive Layout**: Mobil ve desktop için uyumlu tasarım
- **Sticky Button**: Sayfa ile birlikte hareket eden upgrade butonu
- **Blurred Background**: Arka plan içeriğinin bulanıklaşması

### Görsel Öğeler:
- **Ana Çerçeve**: `border-4 border-amber-400/50` sarı kenarlık
- **Lock Icon**: `w-20 h-20` amber/orange gradient
- **Premium Features**: 3 sütunlu kart düzeni
- **Benefits Section**: "Everything You Get" özellik listesi
- **Sticky Button**: `fixed bottom-24` konumunda

## 📁 Dosya Yapısı ve İçerikleri

### 1. Ana Bileşen Dosyası

**Dosya Yolu**: `frontend/project/src/components/strategies/StrategiesAccessControl.tsx`

```tsx
import React, { useState } from 'react';
import { useAuthStore } from '@/stores/authStore';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UpgradeRequestDialog } from './UpgradeRequestDialog';
import { Lock, Crown, Sparkles, Target, TrendingUp, CheckCircle2, Shield } from 'lucide-react';

interface StrategiesAccessControlProps {
  children: React.ReactNode;
}

export function StrategiesAccessControl({ children }: StrategiesAccessControlProps) {
  const { user } = useAuthStore();
  const [isUpgradeDialogOpen, setIsUpgradeDialogOpen] = useState(false);

  // If user is ADMIN, show the normal strategies page
  if (user?.role === 'ADMIN') {
    return <>{children}</>;
  }

  // If user is USER, show the locked interface
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden">
      {/* Reduced blur background overlay */}
      <div className="absolute inset-0 bg-black/20 backdrop-blur-sm z-10" />
      
      {/* Background content (slightly visible) */}
      <div className="relative z-0 opacity-30">
        {children}
      </div>

      {/* Framed original design at top */}
      <div className="relative z-20 pt-8 px-4">
        <div className="max-w-4xl mx-auto">
          {/* Highly visible frame */}
          <div className="bg-slate-800/95 border-4 border-amber-400/50 rounded-2xl shadow-2xl backdrop-blur-lg p-8">
            <div className="space-y-8">
              
              {/* Lock Icon - Original size but framed */}
              <div className="w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg">
                <Lock className="w-10 h-10 text-white" />
              </div>

              {/* Title - Original */}
              <h1 className="text-4xl font-bold text-white text-center mb-4">
                Unlock Automated Copy Trading
              </h1>

              {/* Description - Original */}
              <p className="text-slate-400 text-lg text-center mb-8 leading-relaxed max-w-2xl mx-auto">
                Your current role does not have permission to create and manage automated trading strategies. 
                To upgrade your access, please submit a request.
              </p>

              {/* Premium Features - Original design */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-6 text-center">
                  <Crown className="w-8 h-8 text-amber-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Premium Features</h3>
                  <p className="text-sm text-slate-400">
                    Create unlimited automated trading strategies
                  </p>
                </div>
                
                <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-6 text-center">
                  <Target className="w-8 h-8 text-emerald-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Smart Trading</h3>
                  <p className="text-sm text-slate-400">
                    Advanced copy trading with AI-powered signals
                  </p>
                </div>
                
                <div className="bg-slate-700/60 border border-slate-600/50 rounded-xl p-6 text-center">
                  <TrendingUp className="w-8 h-8 text-blue-400 mx-auto mb-3" />
                  <h3 className="font-semibold text-white mb-2">Real Analytics</h3>
                  <p className="text-sm text-slate-400">
                    Detailed performance tracking and insights
                  </p>
                </div>
              </div>

              {/* Additional Benefits - Original design */}
              <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 p-6 rounded-lg border border-emerald-500/30 mb-8">
                <div className="flex items-center justify-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-lg font-semibold text-emerald-400">Everything You Get</h3>
                  <Sparkles className="w-5 h-5 text-emerald-400" />
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left max-w-2xl mx-auto">
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Unlimited strategy creation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Real-time trade execution</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Advanced risk management</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Priority support</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">AI-powered trading signals</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span className="text-sm text-slate-300">Advanced analytics dashboard</span>
                  </div>
                </div>
              </div>

              {/* Info - Original */}
              <p className="text-sm text-slate-500 text-center">
                Request approval typically takes 1-3 business days. 
                You'll receive email confirmation once your account is upgraded.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Request Button */}
      <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 z-30">
        <Button 
          className="h-12 px-8 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all duration-200"
          onClick={() => setIsUpgradeDialogOpen(true)}
        >
          <Crown className="mr-2 h-4 w-4" />
          Request Upgrade
        </Button>
      </div>

      {/* Upgrade Request Dialog */}
      <UpgradeRequestDialog
        isOpen={isUpgradeDialogOpen}
        onOpenChange={setIsUpgradeDialogOpen}
      />
    </div>
  );
}
```

### 2. Upgrade Request Dialog Bileşeni

**Dosya Yolu**: `frontend/project/src/components/strategies/UpgradeRequestDialog.tsx`

```tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/authStore';
import { toast } from 'sonner';

interface UpgradeRequestDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UpgradeRequestDialog({ isOpen, onOpenChange }: UpgradeRequestDialogProps) {
  const { user, token } = useAuthStore();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    contactInfo: '',
    message: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.email.trim()) {
      toast.error('Email is required');
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:3001/api/auth/upgrade-request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        toast.success('Upgrade request submitted successfully!');
        onOpenChange(false);
        setFormData({ email: '', contactInfo: '', message: '' });
      } else {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to submit upgrade request');
      }
    } catch (error) {
      console.error('Upgrade request error:', error);
      toast.error('Failed to submit upgrade request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Crown className="h-5 w-5 text-amber-400" />
            Request Access Upgrade
          </DialogTitle>
          <DialogDescription>
            Submit a request to upgrade your account and access premium features
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              placeholder="your@email.com"
              value={formData.email}
              onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="contactInfo">Contact Information (Optional)</Label>
            <Input
              id="contactInfo"
              placeholder="Phone number or preferred contact method"
              value={formData.contactInfo}
              onChange={(e) => setFormData(prev => ({ ...prev, contactInfo: e.target.value }))}
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="message">Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Tell us why you'd like to upgrade your account..."
              value={formData.message}
              onChange={(e) => setFormData(prev => ({ ...prev, message: e.target.value }))}
              rows={3}
            />
          </div>
          
          <div className="flex gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={isSubmitting}
              className="flex-1 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Strategies Page Entegrasyonu

**Dosya Yolu**: `frontend/project/src/pages/StrategiesPage.tsx`

```tsx
import React from 'react';
import { StrategyWizard } from '../components/strategies/StrategyWizard';
import { StrategiesAccessControl } from '../components/strategies/StrategiesAccessControl';

export function StrategiesPage() {
  return (
    <StrategiesAccessControl>
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">My Strategies</h1>
          <p className="text-slate-400">Create and manage your automated trading strategies</p>
        </div>
        
        <StrategyWizard />
      </div>
    </StrategiesAccessControl>
  );
}
```

### 4. İlgili Backend Servisleri

**Dosya Yolu**: `src/services/upgradeRequestService.js`

```javascript
class UpgradeRequestService {
  async createUpgradeRequest(userId, requestData) {
    try {
      // Check for existing pending request
      const existingRequest = await prisma.upgradeRequest.findFirst({
        where: {
          userId,
          status: 'PENDING'
        }
      });

      if (existingRequest) {
        throw new Error('You already have a pending upgrade request');
      }

      // Create upgrade request
      const upgradeRequest = await prisma.upgradeRequest.create({
        data: {
          userId,
          email: requestData.email,
          contactInfo: requestData.contactInfo || null,
          message: requestData.message || null,
          status: 'PENDING'
        },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              username: true
            }
          }
        }
      });

      // Send email notification to admin
      await this.sendAdminNotification(upgradeRequest);

      return upgradeRequest;
    } catch (error) {
      console.error('Upgrade request creation error:', error);
      throw error;
    }
  }

  async sendAdminNotification(upgradeRequest) {
    try {
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@zenithtrader.com';
      
      const emailContent = {
        to: adminEmail,
        subject: 'New Upgrade Request - Zenith Trader',
        html: `
          <h2>New Upgrade Request</h2>
          <p><strong>User:</strong> ${upgradeRequest.user.username} (${upgradeRequest.user.email})</p>
          <p><strong>Contact Email:</strong> ${upgradeRequest.email}</p>
          ${upgradeRequest.contactInfo ? `<p><strong>Contact Info:</strong> ${upgradeRequest.contactInfo}</p>` : ''}
          ${upgradeRequest.message ? `<p><strong>Message:</strong> ${upgradeRequest.message}</p>` : ''}
          <p><strong>Requested:</strong> ${upgradeRequest.createdAt}</p>
          <hr>
          <p>Please review this request in the admin panel.</p>
        `
      };

      await emailService.sendEmail(emailContent);
    } catch (error) {
      console.error('Admin notification error:', error);
    }
  }
}

export const upgradeRequestService = new UpgradeRequestService();
```

### 5. API Endpoint

**Dosya Yolu**: `src/api/authRoutes.js`

```javascript
// Upgrade request endpoint
router.post('/upgrade-request', authService.authenticateToken, async (req, res) => {
  try {
    const { email, contactInfo, message } = req.body;
    
    if (!email) {
      return res.status(400).json({ 
        success: false, 
        message: 'Email is required' 
      });
    }

    const upgradeRequest = await upgradeRequestService.createUpgradeRequest(req.user.userId, {
      email,
      contactInfo,
      message
    });

    res.json({
      success: true,
      message: 'Upgrade request submitted successfully',
      data: upgradeRequest
    });
  } catch (error) {
    console.error('Upgrade request error:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to submit upgrade request'
    });
  }
});
```

### 6. Database Schema

**Dosya Yolu**: `prisma/schema.prisma`

```prisma
model UpgradeRequest {
  id          Int      @id @default(autoincrement())
  userId      Int
  email       String
  contactInfo String?
  message     String?
  status      String   @default("PENDING")
  adminNotes  String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  user User @relation(fields: [userId], references: [id])

  @@map("upgrade_requests")
}
```

## 🎯 CSS ve Stil Özellikleri

### Ana Container Stilleri:
```css
.min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative overflow-hidden
```

### Background Overlay:
```css
.absolute inset-0 bg-black/20 backdrop-blur-sm z-10
```

### Çerçeve Stilleri:
```css
.bg-slate-800/95 border-4 border-amber-400/50 rounded-2xl shadow-2xl backdrop-blur-lg p-8
```

### Lock Icon Stilleri:
```css
.w-20 h-20 bg-gradient-to-br from-amber-400 to-orange-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg
```

### Sticky Button Stilleri:
```css
.fixed bottom-24 left-1/2 transform -translate-x-1/2 z-30
.h-12 px-8 bg-gradient-to-r from-emerald-500 to-blue-500 hover:from-emerald-600 hover:to-blue-600 text-white font-semibold shadow-lg hover:shadow-emerald-500/25 transition-all duration-200
```

## 🔄 Entegrasyon Akışı

1. **USER rolü kullanıcısı** `/strategies` sayfasına erişir
2. **StrategiesAccessControl** bileşeni devreye girer
3. **Normal strateji içeriği** opacity:30 ile görünür hale getirilir
4. **Framed upgrade prompt** sayfanın üstünde gösterilir
5. **Sticky upgrade butonu** sayfa ile hareket eder
6. **Butona tıklanınca** UpgradeRequestDialog açılır
7. **Form gönderilince** upgradeRequestService devreye girer
8. **Admin email bildirimi** gönderilir
9. **Veritabanına kayıt** Prisma ile yapılır

## 📱 Responsive Davranış

### Desktop (md ve üstü):
- 3 sütunlu premium features grid
- Max genişlik: max-w-4xl
- Büyük padding: p-8

### Mobile (md altı):
- 1 sütunlu premium features grid
- Full width mobil uyumlu
- Küçük padding: responsive padding

## 🎨 Renk Paleti

- **Ana Arka Plan**: `from-slate-900 via-slate-800 to-slate-900`
- **Çerçeve**: `border-amber-400/50`
- **Lock Icon**: `from-amber-400 to-orange-500`
- **Premium Features**: `bg-slate-700/60`
- **Buton Gradient**: `from-emerald-500 to-blue-500`
- **Benefits Section**: `from-emerald-500/10 to-blue-500/10`

## 🔧 Kullanılan Kütüphaneler ve Bileşenler

### React Kütüphaneleri:
- `react` (v18+)
- `react-router-dom` (v6+)
- `zustand` (state management)

### UI Bileşenleri:
- `@/components/ui/card`
- `@/components/ui/button`
- `@/components/ui/input`
- `@/components/ui/textarea`
- `@/components/ui/label`
- `@/components/ui/dialog`

### Icon Kütüphanesi:
- `lucide-react` (tüm ikonlar)

### Diğer:
- `tailwindcss` (styling)
- `sonner` (toast notifications)
- `prisma` (database ORM)

---

Bu doküman, kilitli stratejiler sayfasının tüm teknik detaylarını içermektedir. Tasarımın her yönü dosya yolları ve kod içerikleriyle birlikte belgelenmiştir.