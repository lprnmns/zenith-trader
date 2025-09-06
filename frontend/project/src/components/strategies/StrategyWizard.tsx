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
            <ModernInput
              label="Strateji Adı"
              placeholder="Örnek: BTC Takip Stratejisi"
              {...methods.register('name')}
              error={errors.name?.message}
              validateOnChange={true}
              validationRule={{
                pattern: /^[a-zA-Z0-9\s\-_]+$/,
                min: 1,
                max: 50
              }}
            />
            
            <ModernInput
              label="Cüzdan Adresi"
              placeholder="0x..."
              {...methods.register('walletAddress')}
              error={errors.walletAddress?.message}
              validateOnChange={true}
              validationRule={{
                pattern: /^0x[a-fA-F0-9]{40}$/,
                min: 42,
                max: 42
              }}
              className="font-mono"
            />
          </div>
        );

      case 'exchange':
        return (
          <div className="space-y-6">
            {/* OKX Credentials Auto-fill */}
            {watchedValues.exchange === 'OKX' && (
              <div className="modern-card p-4 border border-emerald-400/20 bg-emerald-400/5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-emerald-400">OKX Kimlik Bilgileri</h3>
                  <button
                    type="button"
                    onClick={handleAutoFillOKXCredentials}
                    className="modern-button sm primary"
                    disabled={isLoadingCredentials}
                  >
                    {isLoadingCredentials ? 'Yükleniyor...' : 'Kimlik Bilgilerini Getir'}
                  </button>
                </div>
                
                {credentialsError && (
                  <div className="modern-alert error mb-3">
                    <p>{credentialsError}</p>
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
                        <button
                          type="button"
                          onClick={handleUseCredentials}
                          className="modern-button sm success"
                        >
                          Bu Bilgileri Kullan
                        </button>
                        <span className="text-xs text-slate-400">
                          Kayıtlı OKX kimlik bilgileri stratejiye eklenecektir
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <ModernSelect
              label="Borsa Seçimi"
              value={watchedValues.exchange}
              onChange={(value) => setValue('exchange', value)}
              options={[
                { value: 'OKX', label: 'OKX' },
                { value: 'Binance', label: 'Binance' },
                { value: 'Bybit', label: 'Bybit' }
              ]}
              error={errors.exchange?.message}
            />

            <ModernSelect
              label="Kopyalama Modu"
              value={watchedValues.copyMode}
              onChange={(value) => setValue('copyMode', value)}
              options={[
                { value: 'Perpetual', label: 'Perpetual (Sürekli)' },
                { value: 'Spot', label: 'Spot' }
              ]}
              error={errors.copyMode?.message}
            />

            {/* OKX Credentials Input Fields */}
            {watchedValues.exchange === 'OKX' && (
              <div className="space-y-4 mt-4 p-4 border border-emerald-400/20 bg-emerald-400/5 rounded-lg">
                <h4 className="text-sm font-medium text-emerald-400 mb-3">OKX API Bilgileri</h4>
                
                <ModernInput
                  label="API Key"
                  placeholder="OKX API Key"
                  value={watchedValues.apiKey || ''}
                  onChange={(e) => setValue('apiKey', e.target.value)}
                  error={errors.apiKey?.message}
                  helperText="OKX hesabınızdan aldığınız API Key"
                />
                
                <ModernInput
                  label="API Secret"
                  placeholder="OKX API Secret"
                  value={watchedValues.apiSecret || ''}
                  onChange={(e) => setValue('apiSecret', e.target.value)}
                  error={errors.apiSecret?.message}
                  helperText="OKX hesabınızdan aldığınız API Secret"
                  type="password"
                />
                
                <ModernInput
                  label="Passphrase"
                  placeholder="OKX Passphrase"
                  value={watchedValues.passphrase || ''}
                  onChange={(e) => setValue('passphrase', e.target.value)}
                  error={errors.passphrase?.message}
                  helperText="API oluştururken belirlediğiniz passphrase"
                  type="password"
                />
              </div>
            )}
          </div>
        );

      case 'futures':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-primary">
                Kaldıraç: {watchedValues.leverage}x
              </label>
              <div className="space-y-2">
                <input
                  type="range"
                  min="1"
                  max="125"
                  {...methods.register('leverage', { valueAsNumber: true })}
                  className="w-full h-2 bg-surface-light rounded-lg appearance-none cursor-pointer slider"
                />
                <div className="flex justify-between text-xs text-slate-400">
                  <span>1x</span>
                  <span>125x</span>
                </div>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Yüksek kaldıraç risk ve potansiyel getirileri artırır
              </p>
            </div>

            <ModernSelect
              label="Marj Modu"
              value={watchedValues.marginMode}
              onChange={(value) => setValue('marginMode', value)}
              options={[
                { value: 'cross', label: 'Cross (Çapraz)' },
                { value: 'isolated', label: 'Isolated (İzole)' }
              ]}
              error={errors.marginMode?.message}
            />
          </div>
        );

      case 'sizing':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Sizing Method</label>
              <div className="grid grid-cols-2 gap-2">
                {['Fixed Amount', 'Percentage of Wallet\'s Trade'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setValue('sizingMethod', method as any)}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      watchedValues.sizingMethod === method
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium">{method}</div>
                  </button>
                ))}
              </div>
            </div>

            {watchedValues.sizingMethod === 'Fixed Amount' ? (
              <div>
                <label className="block text-sm font-medium mb-1">Amount per Trade (USD)</label>
                <input
                  type="number"
                  min="1"
                  {...methods.register('amountPerTrade', { valueAsNumber: true })}
                  className="w-full p-2 border rounded-md"
                />
                {errors.amountPerTrade && (
                  <p className="text-red-500 text-sm mt-1">{errors.amountPerTrade.message}</p>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium mb-1">Percentage to Copy (%)</label>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="1"
                    max="100"
                    {...methods.register('percentageToCopy', { valueAsNumber: true })}
                    className="flex-1"
                  />
                  <span className="w-12 text-center font-medium">
                    {watchedValues.percentageToCopy}%
                  </span>
                </div>
              </div>
            )}

            <div>
              <label className="block text-sm font-medium mb-1">Stop Loss (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                {...methods.register('stopLoss', { valueAsNumber: true })}
                className="w-full p-2 border rounded-md"
                placeholder="5.0"
              />
              <p className="text-xs text-gray-500 mt-1">
                Automatic position close at this loss percentage
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Daily Trade Limit</label>
              <input
                type="number"
                min="1"
                {...methods.register('dailyLimit', { valueAsNumber: true })}
                className="w-full p-2 border rounded-md"
                placeholder="10"
              />
            </div>
          </div>
        );

      case 'symbols':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Allowed Tokens</label>
              <div className="space-y-2">
                {['BTC', 'ETH', 'SOL', 'AVAX', 'MATIC', 'UNI', 'LINK', 'AAVE'].map((token) => (
                  <label key={token} className="flex items-center space-x-2">
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
                    />
                    <span className="text-sm">{token}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Min Trade Size (USD)</label>
                <input
                  type="number"
                  min="0"
                  {...methods.register('minTradeSize', { valueAsNumber: true })}
                  className="w-full p-2 border rounded-md"
                  placeholder="10"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Max Trade Size (USD)</label>
                <input
                  type="number"
                  min="0"
                  {...methods.register('maxTradeSize', { valueAsNumber: true })}
                  className="w-full p-2 border rounded-md"
                  placeholder="1000"
                />
              </div>
            </div>
          </div>
        );

      case 'execution':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Execution Delay (seconds)</label>
              <input
                type="number"
                min="0"
                max="300"
                {...methods.register('executionDelay', { valueAsNumber: true })}
                className="w-full p-2 border rounded-md"
              />
              <p className="text-xs text-gray-500 mt-1">
                Delay before executing trades (0 for immediate)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Max Slippage (%)</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="0"
                  max="10"
                  step="0.1"
                  {...methods.register('maxSlippage', { valueAsNumber: true })}
                  className="flex-1"
                />
                <span className="w-12 text-center font-medium">
                  {watchedValues.maxSlippage}%
                </span>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Retry Attempts</label>
              <input
                type="number"
                min="0"
                max="5"
                {...methods.register('retryAttempts', { valueAsNumber: true })}
                className="w-full p-2 border rounded-md"
              />
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...methods.register('enablePartialFills')}
                />
                <span className="text-sm">Enable partial fills</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...methods.register('autoAdjustPosition')}
                />
                <span className="text-sm">Auto-adjust position size</span>
              </label>
            </div>

            <div className="space-y-2">
              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...methods.register('enableTradeNotifications')}
                />
                <span className="text-sm">Trade notifications</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...methods.register('enableErrorNotifications')}
                />
                <span className="text-sm">Error notifications</span>
              </label>

              <label className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  {...methods.register('enableDailyReports')}
                />
                <span className="text-sm">Daily reports</span>
              </label>
            </div>
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-xl font-bold text-primary mb-2">Strateji Özeti</h3>
              <p className="text-slate-400">Lütfen strateji ayarlarınızı kontrol edin</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="bg-surface border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Temel Bilgiler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Adı:</span>
                    <span className="font-medium">{watchedValues.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Cüzdan:</span>
                    <span className="font-mono text-xs">
                      {watchedValues.walletAddress?.slice(0, 6)}...{watchedValues.walletAddress?.slice(-4)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                    <ExternalLink className="w-4 h-4" />
                    Borsa Ayarları
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Platform:</span>
                    <span className="font-medium">{watchedValues.exchange}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Mod:</span>
                    <span className="font-medium">{watchedValues.copyMode}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Futures Ayarları
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Kaldıraç:</span>
                    <span className="font-medium">{watchedValues.leverage}x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Marj:</span>
                    <span className="font-medium">{watchedValues.marginMode === 'cross' ? 'Cross (Çapraz)' : 'Isolated (İzole)'}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-surface border-border">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium text-primary flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Risk Yönetimi
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Stop Loss:</span>
                    <span className="font-medium">{watchedValues.stopLoss ? `${watchedValues.stopLoss}%` : 'Yok'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Günlük Limit:</span>
                    <span className="font-medium">{watchedValues.dailyLimit ? `$${watchedValues.dailyLimit}` : 'Yok'}</span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="bg-surface-light border border-border rounded-lg p-4">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-success mt-0.5" />
                <div>
                  <h4 className="font-medium text-primary">Strateji Hazır!</h4>
                  <p className="text-sm text-slate-400 mt-1">
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="strategy-wizard modern-dialog w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-2xl font-bold text-primary">Strateji Oluştur</CardTitle>
            <ModernButton
              variant="ghost"
              size="sm"
              onClick={onClose}
              leftIcon={<X className="w-4 h-4" />}
              className="text-slate-400 hover:text-primary"
            />
          </div>
          
          <StepProgressIndicator steps={stepProgressData} />
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {renderStepContent()}

              <div className="flex items-center justify-between pt-4 border-t border-border">
                <div className="flex items-center gap-3">
                  {currentStep > 0 && (
                    <ModernButton
                      type="button"
                      variant="outlined"
                      size="md"
                      onClick={prevStep}
                      leftIcon={<ChevronLeft className="w-4 h-4" />}
                    >
                      Geri
                    </ModernButton>
                  )}
                  
                  {currentStep === 0 && (
                    <ModernButton
                      type="button"
                      variant="outlined"
                      size="md"
                      onClick={loadDraft}
                    >
                      Taslağı Yükle
                    </ModernButton>
                  )}
                  
                  <ModernButton
                    type="button"
                    variant="outlined"
                    size="md"
                    onClick={saveDraft}
                    leftIcon={<Save className="w-4 h-4" />}
                  >
                    Taslağı Kaydet
                    {draftSaved && <span className="ml-1 text-success">✓</span>}
                  </ModernButton>
                </div>

                <div className="flex items-center gap-3">
                  {currentStep < steps.length - 1 ? (
                    <ModernButton
                      type="button"
                      variant="primary"
                      size="md"
                      onClick={nextStep}
                      rightIcon={<ChevronRight className="w-4 h-4" />}
                    >
                      İleri
                    </ModernButton>
                  ) : (
                    <ModernButton
                      type="submit"
                      variant="primary"
                      size="md"
                      loading={isSubmitting}
                      disabled={!isValid}
                    >
                      {isSubmitting ? 'Oluşturuluyor...' : 'Strateji Oluştur'}
                    </ModernButton>
                  )}
                </div>
              </div>
            </form>
          </FormProvider>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyWizard;