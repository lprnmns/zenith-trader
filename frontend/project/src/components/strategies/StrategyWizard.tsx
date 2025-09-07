import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Save, X, Info, ExternalLink, TrendingUp, Shield, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import StepProgressIndicator from './StepProgressIndicator';
import ModernInput from './ModernInput';
import ModernSelect from './ModernSelect';
import ModernButton from './ModernButton';
import { useAuthStore } from '@/stores/authStore';
import '@/styles/strategy-wizard.css';

// Wizard steps configuration
const wizardSteps = [
  {
    id: 1,
    title: 'Temel Bilgiler',
    description: 'Strateji adı ve cüzdan adresi',
    fields: ['name', 'walletAddress']
  },
  {
    id: 2,
    title: 'Borsa Seçimi',
    description: 'İşlem yapılacak borsayı seçin',
    fields: ['exchange', 'copyMode']
  },
  {
    id: 3,
    title: 'Futures Ayarları',
    description: 'Kaldıraç ve marj modu',
    fields: ['leverage', 'marginMode']
  },
  {
    id: 4,
    title: 'Pozisyon Boyutu',
    description: 'İşlem büyüklüğü ayarları',
    fields: ['sizingMethod', 'positionSize', 'amountPerTrade', 'percentageToCopy']
  },
  {
    id: 5,
    title: 'Risk Yönetimi',
    description: 'Stop loss ve günlük limit',
    fields: ['stopLoss', 'dailyLimit']
  },
  {
    id: 6,
    title: 'Sembol Filtreleri',
    description: 'İşlem yapılacak tokenlar',
    fields: ['allowedTokens', 'minTradeSize', 'maxTradeSize']
  },
  {
    id: 7,
    title: 'Çalıştırma Ayarları',
    description: 'İşlem yürütme parametreleri',
    fields: ['executionDelay', 'maxSlippage', 'retryAttempts', 'enablePartialFills']
  }
];

// Strategy validation schema
const strategySchema = z.object({
  name: z.string().min(1, 'Strategy name is required').max(50, 'Name too long'),
  walletAddress: z.string().min(42, 'Invalid wallet address').max(42, 'Invalid wallet address'),
  exchange: z.enum(['OKX', 'Binance', 'Bybit']),
  copyMode: z.enum(['Perpetual', 'Spot']),
  
  // Futures configuration
  leverage: z.number().min(1).max(125),
  marginMode: z.enum(['cross', 'isolated']),
  
  // Position sizing
  sizingMethod: z.enum(['Fixed Amount', 'Percentage of Wallet\'s Trade']),
  positionSize: z.number().min(1),
  amountPerTrade: z.number().optional(),
  percentageToCopy: z.number().min(0).max(100).optional(),
  
  // Risk management
  stopLoss: z.number().min(0).max(100).optional(),
  dailyLimit: z.number().min(1).optional(),
  
  // Symbol filters
  allowedTokens: z.array(z.string()).default([]),
  minTradeSize: z.number().min(0).optional(),
  maxTradeSize: z.number().min(0).optional(),
  
  // Execution settings
  executionDelay: z.number().min(0).max(300).default(0),
  maxSlippage: z.number().min(0).max(10).default(1),
  retryAttempts: z.number().min(0).max(5).default(3),
  
  // Advanced settings
  enablePartialFills: z.boolean().default(true),
  autoAdjustPosition: z.boolean().default(false),
  enableLiquidationProtection: z.boolean().default(true),
  
  // Notifications
  enableTradeNotifications: z.boolean().default(true),
  enableErrorNotifications: z.boolean().default(true),
  enableDailyReports: z.boolean().default(false),
  
  // OKX Credentials
  apiKey: z.string().optional(),
  apiSecret: z.string().optional(),
  passphrase: z.string().optional(),
});

type StrategyFormData = z.infer<typeof strategySchema>;

interface StrategyWizardProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (strategy: any) => void;
  editStrategy?: any;
}

const steps = [
  { id: 'basic', title: 'Basic Info', description: 'Strategy name and wallet' },
  { id: 'exchange', title: 'Exchange', description: 'Trading platform settings' },
  { id: 'futures', title: 'Futures Config', description: 'Leverage and margin settings' },
  { id: 'sizing', title: 'Position Sizing', description: 'Trade size and limits' },
  { id: 'symbols', title: 'Symbol Filters', description: 'Token and size restrictions' },
  { id: 'execution', title: 'Execution', description: 'Trading execution settings' },
  { id: 'review', title: 'Review', description: 'Review and create strategy' },
];

const StrategyWizard: React.FC<StrategyWizardProps> = ({ 
  isOpen, 
  onClose, 
  onSuccess, 
  editStrategy 
}) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [draftSaved, setDraftSaved] = useState(false);
  const [formData, setFormData] = useState<Partial<StrategyFormData>>({});
  
  // OKX Credentials states
  const [isLoadingCredentials, setIsLoadingCredentials] = useState(false);
  const [credentialsInfo, setCredentialsInfo] = useState<any>(null);
  const [credentialsError, setCredentialsError] = useState<string | null>(null);
  
  const { fetchOKXCredentials } = useAuthStore();

  // Step progress data
  const stepProgressData = wizardSteps.map((step, index) => ({
    id: index + 1,
    title: step.title,
    description: step.description,
    completed: index < currentStep,
    active: index === currentStep,
  }));

  // OKX Credentials handlers
  const handleAutoFillOKXCredentials = async () => {
    setIsLoadingCredentials(true);
    setCredentialsError(null);
    
    try {
      const result = await fetchOKXCredentials();
      if (result.success) {
        setCredentialsInfo(result.credentials);
      } else {
        setCredentialsError(result.error || 'Kimlik bilgileri alınamadı');
      }
    } catch (error) {
      setCredentialsError('Bir hata oluştu');
    } finally {
      setIsLoadingCredentials(false);
    }
  };

  const handleUseCredentials = () => {
    if (credentialsInfo) {
      // Update form values with credentials
      setValue('apiKey', credentialsInfo.okxApiKey);
      setValue('apiSecret', credentialsInfo.okxApiSecret);
      setValue('passphrase', credentialsInfo.okxPassphrase);
    }
  };

  const methods = useForm<StrategyFormData>({
    resolver: zodResolver(strategySchema),
    defaultValues: {
      exchange: 'OKX',
      copyMode: 'Perpetual',
      leverage: 5,
      marginMode: 'cross',
      sizingMethod: 'Fixed Amount',
      positionSize: 100,
      executionDelay: 0,
      maxSlippage: 1,
      retryAttempts: 3,
      enablePartialFills: true,
      autoAdjustPosition: false,
      enableLiquidationProtection: true,
      enableTradeNotifications: true,
      enableErrorNotifications: true,
      enableDailyReports: false,
      allowedTokens: [],
      ...editStrategy,
      ...formData,
    },
  });

  const { 
    handleSubmit, 
    formState: { errors, isValid }, 
    watch, 
    setValue,
    getValues 
  } = methods;

  const watchedValues = watch();

  // Auto-save draft
  React.useEffect(() => {
    const timer = setTimeout(() => {
      const currentData = getValues();
      setFormData(currentData);
      localStorage.setItem('strategyDraft', JSON.stringify(currentData));
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2000);
    }, 2000);

    return () => clearTimeout(timer);
  }, [watchedValues, getValues]);

  const nextStep = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const onSubmit = async (data: StrategyFormData) => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/strategies', {
        method: editStrategy ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create strategy');
      }

      const strategy = await response.json();
      onSuccess?.(strategy);
      
      // Clear draft
      localStorage.removeItem('strategyDraft');
      onClose();
    } catch (error) {
      console.error('Error creating strategy:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const saveDraft = () => {
    const currentData = getValues();
    localStorage.setItem('strategyDraft', JSON.stringify(currentData));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const loadDraft = () => {
    const draft = localStorage.getItem('strategyDraft');
    if (draft) {
      const draftData = JSON.parse(draft);
      Object.entries(draftData).forEach(([key, value]) => {
        setValue(key as keyof StrategyFormData, value);
      });
    }
  };

  const renderStepContent = () => {
    switch (steps[currentStep].id) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border border-emerald-500/20 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Strateji Bilgileri</h3>
              <p className="text-sm text-gray-400">Kopya ticaret stratejiniz için temel bilgileri girin</p>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Strateji Adı</label>
              <input
                type="text"
                placeholder="Örnek: BTC Takip Stratejisi"
                {...methods.register('name')}
                className="w-full px-4 py-3 text-lg rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(71, 85, 105, 0.5)',
                  color: '#f3f4f6',
                  border: '2px solid rgba(156, 163, 175, 0.3)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#10b981';
                  e.target.style.backgroundColor = 'rgba(71, 85, 105, 0.7)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(156, 163, 175, 0.3)';
                  e.target.style.backgroundColor = 'rgba(71, 85, 105, 0.5)';
                }}
              />
              {errors.name && (
                <p className="text-red-400 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Cüzdan Adresi</label>
              <input
                type="text"
                placeholder="0x..."
                {...methods.register('walletAddress')}
                className="w-full px-4 py-3 font-mono rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(71, 85, 105, 0.5)',
                  color: '#f3f4f6',
                  border: '2px solid rgba(156, 163, 175, 0.3)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#10b981';
                  e.target.style.backgroundColor = 'rgba(71, 85, 105, 0.7)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(156, 163, 175, 0.3)';
                  e.target.style.backgroundColor = 'rgba(71, 85, 105, 0.5)';
                }}
              />
              {errors.walletAddress && (
                <p className="text-red-400 text-sm mt-1">{errors.walletAddress.message}</p>
              )}
            </div>
          </div>
        );

      case 'exchange':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-blue-500/10 to-purple-500/10 border border-blue-500/20 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Borsa Ayarları</h3>
              <p className="text-sm text-gray-400">İşlem yapacağınız borsayı ve kopyalama modunu seçin</p>
            </div>

            {/* OKX Credentials Auto-fill */}
            {watchedValues.exchange === 'OKX' && (
              <div className="bg-gradient-to-r from-emerald-500/10 to-green-500/10 border border-emerald-500/20 rounded-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-emerald-400">OKX Kimlik Bilgileri</h3>
                  <ModernButton
                    variant="primary"
                    size="sm"
                    onClick={handleAutoFillOKXCredentials}
                    loading={isLoadingCredentials}
                  >
                    {isLoadingCredentials ? 'Yükleniyor...' : 'Kimlik Bilgilerini Getir'}
                  </ModernButton>
                </div>
                
                {credentialsError && (
                  <div className="modern-alert error mb-3">
                    <p>{credentialsError}</p>
                  </div>
                )}

                {credentialsInfo && (!credentialsInfo.okxApiKey || !credentialsInfo.okxApiSecret || !credentialsInfo.okxPassphrase) && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-3">
                    <p className="text-sm text-amber-400">
                      ⚠️ Profilinizde kayıtlı OKX kimlik bilgileri bulunamadı. Lütfen profil ayarlarınızdan OKX API bilgilerinizi ekleyin veya aşağıdaki alanlara manuel olarak girin.
                    </p>
                  </div>
                )}

                {credentialsInfo && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-400">API Key:</span>
                      <span className="text-sm font-mono text-emerald-400">
                        {credentialsInfo.okxApiKey ? '•••••••••••••••••••••••••' : 'Kayıtlı değil'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-400">API Secret:</span>
                      <span className="text-sm font-mono text-emerald-400">
                        {credentialsInfo.okxApiSecret ? '•••••••••••••••••••••••••' : 'Kayıtlı değil'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-blue-400">Passphrase:</span>
                      <span className="text-sm font-mono text-emerald-400">
                        {credentialsInfo.okxPassphrase ? '•••••••••••••••••••••••••' : 'Kayıtlı değil'}
                      </span>
                    </div>
                    
                    {credentialsInfo.okxApiKey && credentialsInfo.okxApiSecret && credentialsInfo.okxPassphrase && (
                      <div className="flex items-center gap-2 mt-3">
                        <ModernButton
                          type="button"
                          variant="success"
                          size="sm"
                          onClick={handleUseCredentials}
                        >
                          Bu Bilgileri Kullan
                        </ModernButton>
                        <span className="text-xs text-gray-400">
                          Kayıtlı OKX kimlik bilgileri stratejiye eklenecektir
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Borsa Seçimi</label>
              <select
                value={watchedValues.exchange}
                onChange={(e) => setValue('exchange', e.target.value)}
                className="w-full px-4 py-3 rounded-lg outline-none transition-all cursor-pointer"
                style={{
                  backgroundColor: 'rgba(71, 85, 105, 0.5)',
                  color: '#f3f4f6',
                  border: '2px solid rgba(156, 163, 175, 0.3)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#10b981';
                  e.target.style.backgroundColor = 'rgba(71, 85, 105, 0.7)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(156, 163, 175, 0.3)';
                  e.target.style.backgroundColor = 'rgba(71, 85, 105, 0.5)';
                }}
              >
                <option value="OKX">OKX</option>
                <option value="Binance">Binance</option>
                <option value="Bybit">Bybit</option>
              </select>
              {errors.exchange && (
                <p className="text-red-400 text-sm mt-1">{errors.exchange.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Kopyalama Modu</label>
              <select
                value={watchedValues.copyMode}
                onChange={(e) => setValue('copyMode', e.target.value)}
                className="w-full px-4 py-3 rounded-lg outline-none transition-all cursor-pointer"
                style={{
                  backgroundColor: 'rgba(71, 85, 105, 0.5)',
                  color: '#f3f4f6',
                  border: '2px solid rgba(156, 163, 175, 0.3)'
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = '#10b981';
                  e.target.style.backgroundColor = 'rgba(71, 85, 105, 0.7)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = 'rgba(156, 163, 175, 0.3)';
                  e.target.style.backgroundColor = 'rgba(71, 85, 105, 0.5)';
                }}
              >
                <option value="Perpetual">Perpetual (Sürekli)</option>
                <option value="Spot">Spot</option>
              </select>
              {errors.copyMode && (
                <p className="text-red-400 text-sm mt-1">{errors.copyMode.message}</p>
              )}
            </div>

            {/* OKX Credentials Input Fields */}
            {watchedValues.exchange === 'OKX' && (
              <div className="space-y-4 mt-4 p-4 border border-emerald-400/20 bg-emerald-400/5 rounded-lg">
                <h4 className="text-sm font-medium text-emerald-400 mb-3">OKX API Bilgileri</h4>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">API Key</label>
                  <input
                    type="text"
                    placeholder="OKX API Key"
                    value={watchedValues.apiKey || ''}
                    onChange={(e) => setValue('apiKey', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: 'rgba(71, 85, 105, 0.5)',
                      color: '#f3f4f6',
                      border: '2px solid rgba(156, 163, 175, 0.3)'
                    }}
                  />
                  <p className="text-xs text-gray-400">OKX hesabınızdan aldığınız API Key</p>
                  {errors.apiKey && (
                    <p className="text-red-400 text-sm">{errors.apiKey.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">API Secret</label>
                  <input
                    type="password"
                    placeholder="OKX API Secret"
                    value={watchedValues.apiSecret || ''}
                    onChange={(e) => setValue('apiSecret', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: 'rgba(71, 85, 105, 0.5)',
                      color: '#f3f4f6',
                      border: '2px solid rgba(156, 163, 175, 0.3)'
                    }}
                  />
                  <p className="text-xs text-gray-400">OKX hesabınızdan aldığınız API Secret</p>
                  {errors.apiSecret && (
                    <p className="text-red-400 text-sm">{errors.apiSecret.message}</p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-300">Passphrase</label>
                  <input
                    type="password"
                    placeholder="OKX Passphrase"
                    value={watchedValues.passphrase || ''}
                    onChange={(e) => setValue('passphrase', e.target.value)}
                    className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                    style={{
                      backgroundColor: 'rgba(71, 85, 105, 0.5)',
                      color: '#f3f4f6',
                      border: '2px solid rgba(156, 163, 175, 0.3)'
                    }}
                  />
                  <p className="text-xs text-gray-400">API oluştururken belirlediğiniz passphrase</p>
                  {errors.passphrase && (
                    <p className="text-red-400 text-sm">{errors.passphrase.message}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        );

      case 'futures':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/20 rounded-xl p-6 mb-6">
              <h3 className="text-lg font-semibold text-gray-200 mb-2">Futures Ayarları</h3>
              <p className="text-sm text-gray-400">Kaldıraç ve marj modunu ayarlayın</p>
            </div>

            <div className="border border-gray-600 rounded-xl p-6" style={{ backgroundColor: 'rgba(71, 85, 105, 0.3)' }}>
              <div className="flex items-center justify-between mb-4">
                <label className="text-lg font-medium text-gray-200">
                  Kaldıraç: <span className="text-orange-400">{watchedValues.leverage}x</span>
                </label>
                <div className="px-3 py-1 bg-orange-500/20 text-orange-400 rounded-full text-sm font-medium">
                  {watchedValues.leverage > 20 ? 'Yüksek Risk' : watchedValues.leverage > 10 ? 'Orta Risk' : 'Düşük Risk'}
                </div>
              </div>
              
              <div className="space-y-4">
                <input
                  type="range"
                  min="1"
                  max="125"
                  {...methods.register('leverage', { valueAsNumber: true })}
                  className="w-full h-3 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-orange-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-orange-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                />
                <div className="flex justify-between text-sm text-gray-400">
                  <span>1x</span>
                  <span className="text-orange-400">25x</span>
                  <span className="text-red-400">125x</span>
                </div>
              </div>
              
              <div className="mt-4 p-3 bg-orange-500/10 border border-orange-500/20 rounded-lg">
                <p className="text-xs text-orange-400">
                  ⚠️ Yüksek kaldıraç risk ve potansiyel getirileri artırır. Lütfen dikkatli olun.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Marj Modu</label>
              <select
                value={watchedValues.marginMode}
                onChange={(e) => setValue('marginMode', e.target.value)}
                className="w-full px-4 py-3 rounded-lg outline-none transition-all cursor-pointer"
                style={{
                  backgroundColor: 'rgba(71, 85, 105, 0.5)',
                  color: '#f3f4f6',
                  border: '2px solid rgba(156, 163, 175, 0.3)'
                }}
              >
                <option value="cross">Cross (Çapraz)</option>
                <option value="isolated">Isolated (İzole)</option>
              </select>
              {errors.marginMode && (
                <p className="text-red-400 text-sm mt-1">{errors.marginMode.message}</p>
              )}
            </div>
          </div>
        );

      case 'sizing':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2 text-gray-300">Sizing Method</label>
              <div className="grid grid-cols-2 gap-2">
                {['Fixed Amount', 'Percentage of Wallet\'s Trade'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setValue('sizingMethod', method as any)}
                    style={{
                      backgroundColor: watchedValues.sizingMethod === method ? 'rgba(59, 130, 246, 0.3)' : 'rgba(71, 85, 105, 0.5)',
                      color: '#f3f4f6',
                      border: watchedValues.sizingMethod === method ? '2px solid #3b82f6' : '2px solid rgba(156, 163, 175, 0.3)'
                    }}
                    className="p-3 rounded-lg text-center transition-colors hover:bg-opacity-70"
                  >
                    <div className="font-medium">{method}</div>
                  </button>
                ))}
              </div>
            </div>

            {watchedValues.sizingMethod === 'Fixed Amount' ? (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">İşlem Başına Tutar (USD)</label>
                <input
                  type="number"
                  placeholder="100"
                  min={1}
                  {...methods.register('amountPerTrade', { valueAsNumber: true })}
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(71, 85, 105, 0.5)',
                    color: '#f3f4f6',
                    border: '2px solid rgba(156, 163, 175, 0.3)'
                  }}
                />
                <p className="text-xs text-gray-400">Her bir işlem için kullanılacak USD tutarı</p>
                {errors.amountPerTrade && (
                  <p className="text-red-400 text-sm">{errors.amountPerTrade.message}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-300">Percentage to Copy (%)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    {...methods.register('percentageToCopy', { valueAsNumber: true })}
                    className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white"
                  />
                  <span className="w-12 text-center font-medium text-gray-300">
                    {watchedValues.percentageToCopy}%
                  </span>
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Stop Loss (%)</label>
              <input
                type="number"
                placeholder="5.0"
                min={0}
                max={100}
                step={0.1}
                {...methods.register('stopLoss', { valueAsNumber: true })}
                className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(71, 85, 105, 0.5)',
                  color: '#f3f4f6',
                  border: '2px solid rgba(156, 163, 175, 0.3)'
                }}
              />
              <p className="text-xs text-gray-400">Bu kayıp yüzdesinde pozisyon otomatik kapanır</p>
              {errors.stopLoss && (
                <p className="text-red-400 text-sm">{errors.stopLoss.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Günlük İşlem Limiti</label>
              <input
                type="number"
                placeholder="10"
                min={1}
                {...methods.register('dailyLimit', { valueAsNumber: true })}
                className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(71, 85, 105, 0.5)',
                  color: '#f3f4f6',
                  border: '2px solid rgba(156, 163, 175, 0.3)'
                }}
              />
              <p className="text-xs text-gray-400">Günlük maksimum işlem sayısı</p>
              {errors.dailyLimit && (
                <p className="text-red-400 text-sm">{errors.dailyLimit.message}</p>
              )}
            </div>
          </div>
        );

      case 'symbols':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-3 text-gray-300">Allowed Tokens</label>
              <div className="space-y-2">
                {['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'UNI', 'LINK', 'AAVE'].map((token) => (
                  <label key={token} className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-700/30 transition-colors" style={{ backgroundColor: 'rgba(71, 85, 105, 0.2)' }}>
                    <input
                      type="checkbox"
                      checked={watchedValues.allowedTokens?.includes(token) || false}
                      onChange={(e) => {
                        const currentTokens = watchedValues.allowedTokens || [];
                        const newTokens = e.target.checked
                          ? [...currentTokens, token]
                          : currentTokens.filter(t => t !== token);
                        setValue('allowedTokens', newTokens);
                      }}
                      className="w-5 h-5 rounded accent-emerald-500"
                    />
                    <span className="text-sm text-gray-300 font-medium">{token}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Min İşlem Boyutu (USD)</label>
                <input
                  type="number"
                  placeholder="10"
                  min={0}
                  {...methods.register('minTradeSize', { valueAsNumber: true })}
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(71, 85, 105, 0.5)',
                    color: '#f3f4f6',
                    border: '2px solid rgba(156, 163, 175, 0.3)'
                  }}
                />
                <p className="text-xs text-gray-400">Minimum işlem tutarı</p>
              </div>
              
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-300">Max İşlem Boyutu (USD)</label>
                <input
                  type="number"
                  placeholder="1000"
                  min={0}
                  {...methods.register('maxTradeSize', { valueAsNumber: true })}
                  className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                  style={{
                    backgroundColor: 'rgba(71, 85, 105, 0.5)',
                    color: '#f3f4f6',
                    border: '2px solid rgba(156, 163, 175, 0.3)'
                  }}
                />
                <p className="text-xs text-gray-400">Maksimum işlem tutarı</p>
              </div>
            </div>
          </div>
        );

      case 'execution':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">İşlem Gecikmesi (saniye)</label>
              <input
                type="number"
                placeholder="0"
                min={0}
                max={300}
                {...methods.register('executionDelay', { valueAsNumber: true })}
                className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(71, 85, 105, 0.5)',
                  color: '#f3f4f6',
                  border: '2px solid rgba(156, 163, 175, 0.3)'
                }}
              />
              <p className="text-xs text-gray-400">İşlemleri yürütmeden önceki bekleme süresi (0 anında)</p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1 text-gray-300">Max Slippage (%)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  {...methods.register('maxSlippage', { valueAsNumber: true })}
                  className="flex-1 h-2 bg-gray-600 rounded-lg appearance-none cursor-pointer accent-blue-500"
                />
                <span className="w-12 text-center font-medium text-gray-300">
                  {watchedValues.maxSlippage}%
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-medium text-gray-300">Yeniden Deneme Sayısı</label>
              <input
                type="number"
                placeholder="3"
                min={0}
                max={5}
                {...methods.register('retryAttempts', { valueAsNumber: true })}
                className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'rgba(71, 85, 105, 0.5)',
                  color: '#f3f4f6',
                  border: '2px solid rgba(156, 163, 175, 0.3)'
                }}
              />
              <p className="text-xs text-gray-400">Başarısız işlemler için yeniden deneme sayısı</p>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-700/30 transition-colors" style={{ backgroundColor: 'rgba(71, 85, 105, 0.2)' }}>
                <input
                  type="checkbox"
                  {...methods.register('enablePartialFills')}
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                <span className="text-sm text-gray-300">Enable partial fills</span>
              </label>

              <label className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-700/30 transition-colors" style={{ backgroundColor: 'rgba(71, 85, 105, 0.2)' }}>
                <input
                  type="checkbox"
                  {...methods.register('autoAdjustPosition')}
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                <span className="text-sm text-gray-300">Auto-adjust position size</span>
              </label>
            </div>

            <div className="space-y-3">
              <label className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-700/30 transition-colors" style={{ backgroundColor: 'rgba(71, 85, 105, 0.2)' }}>
                <input
                  type="checkbox"
                  {...methods.register('enableTradeNotifications')}
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                <span className="text-sm text-gray-300">Trade notifications</span>
              </label>

              <label className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-700/30 transition-colors" style={{ backgroundColor: 'rgba(71, 85, 105, 0.2)' }}>
                <input
                  type="checkbox"
                  {...methods.register('enableErrorNotifications')}
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                <span className="text-sm text-gray-300">Error notifications</span>
              </label>

              <label className="flex items-center space-x-3 p-3 rounded-lg cursor-pointer hover:bg-gray-700/30 transition-colors" style={{ backgroundColor: 'rgba(71, 85, 105, 0.2)' }}>
                <input
                  type="checkbox"
                  {...methods.register('enableDailyReports')}
                  className="w-5 h-5 rounded accent-emerald-500"
                />
                <span className="text-sm text-gray-300">Daily reports</span>
              </label>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-gray-200 mb-2">Strateji Özeti</h3>
              <p className="text-gray-400">Lütfen strateji ayarlarınızı kontrol edin</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: 'rgba(71, 85, 105, 0.5)', borderColor: 'rgba(156, 163, 175, 0.3)' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Temel Bilgiler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Adı:</span>
                    <span className="font-medium text-gray-200">{watchedValues.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Cüzdan:</span>
                    <span className="font-mono text-xs text-gray-200">
                      {watchedValues.walletAddress?.slice(0, 6)}...{watchedValues.walletAddress?.slice(-4)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: 'rgba(71, 85, 105, 0.5)', borderColor: 'rgba(156, 163, 175, 0.3)' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Borsa Ayarları
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Platform:</span>
                    <span className="font-medium text-gray-200">{watchedValues.exchange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Mod:</span>
                    <span className="font-medium text-gray-200">{watchedValues.copyMode}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: 'rgba(71, 85, 105, 0.5)', borderColor: 'rgba(156, 163, 175, 0.3)' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Futures Ayarları
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Kaldıraç:</span>
                    <span className="font-medium text-gray-200">{watchedValues.leverage}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Marj:</span>
                    <span className="font-medium text-gray-200">{watchedValues.marginMode === 'cross' ? 'Cross (Çapraz)' : 'Isolated (İzole)'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: 'rgba(71, 85, 105, 0.5)', borderColor: 'rgba(156, 163, 175, 0.3)' }}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-emerald-400 flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Risk Yönetimi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Stop Loss:</span>
                    <span className="font-medium text-gray-200">{watchedValues.stopLoss ? `${watchedValues.stopLoss}%` : 'Yok'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Günlük Limit:</span>
                    <span className="font-medium text-gray-200">{watchedValues.dailyLimit ? `$${watchedValues.dailyLimit}` : 'Yok'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-lg p-4 backdrop-blur-sm shadow-lg hover:shadow-xl transition-all duration-300" style={{ backgroundColor: 'rgba(71, 85, 105, 0.5)', borderColor: 'rgba(156, 163, 175, 0.3)', border: '1px solid rgba(156, 163, 175, 0.3)' }}>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
                <div>
                  <h4 className="font-medium text-gray-200">Strateji Hazır!</h4>
                  <p className="text-sm text-gray-400 mt-1">
                    Strateji oluşturulduktan sonra belirtilen cüzdan adresini izlemeye başlayacaktır.
                    Tüm ayarları dikkatlice kontrol edin.
                  </p>
                </div>
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-emerald-500/10 to-blue-500/10 border-b border-gray-700 p-6 -mx-6 -mt-6 mb-6">
        <StepProgressIndicator steps={stepProgressData} />
      </div>
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {renderStepContent()}

              <div className="flex items-center justify-between pt-6 border-t border-gray-600 -mx-6 px-6 -mb-6 pb-6" style={{ backgroundColor: 'rgba(51, 65, 85, 0.3)' }}>
                <div className="flex items-center gap-3">
                  {currentStep > 0 && (
                    <button
                      type="button"
                      onClick={prevStep}
                      className="px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(71, 85, 105, 0.5)',
                        color: '#f3f4f6',
                        border: '2px solid rgba(156, 163, 175, 0.3)'
                      }}
                    >
                      <ChevronLeft className="w-4 h-4" />
                      Geri
                    </button>
                  )}
                  
                  {currentStep === 0 && (
                    <button
                      type="button"
                      onClick={loadDraft}
                      className="px-4 py-2.5 rounded-lg font-medium transition-all hover:scale-105"
                      style={{
                        backgroundColor: 'rgba(71, 85, 105, 0.5)',
                        color: '#f3f4f6',
                        border: '2px solid rgba(156, 163, 175, 0.3)'
                      }}
                    >
                      Taslağı Yükle
                    </button>
                  )}
                  
                  <button
                    type="button"
                    onClick={saveDraft}
                    className="px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105"
                    style={{
                      backgroundColor: 'rgba(71, 85, 105, 0.5)',
                      color: '#f3f4f6',
                      border: '2px solid rgba(156, 163, 175, 0.3)'
                    }}
                  >
                    <Save className="w-4 h-4" />
                    Taslağı Kaydet
                    {draftSaved && <span className="ml-1 text-emerald-400">✓</span>}
                  </button>
                </div>

                <div className="flex items-center gap-3">
                  {currentStep < steps.length - 1 ? (
                    <button
                      type="button"
                      onClick={nextStep}
                      className="px-6 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all hover:scale-105 shadow-lg"
                      style={{
                        background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                        color: '#ffffff',
                        border: 'none'
                      }}
                    >
                      İleri
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  ) : (
                    <button
                      type="submit"
                      disabled={!isValid || isSubmitting}
                      className="px-6 py-2.5 rounded-lg font-medium transition-all hover:scale-105 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{
                        background: !isValid || isSubmitting ? 'rgba(71, 85, 105, 0.5)' : 'linear-gradient(135deg, #10b981 0%, #14b8a6 100%)',
                        color: '#ffffff',
                        border: 'none'
                      }}
                    >
                      {isSubmitting ? 'Oluşturuluyor...' : 'Strateji Oluştur'}
                    </button>
                  )}
                </div>
              </div>
            </form>
          </FormProvider>
        </div>
  );
};

export default StrategyWizard;