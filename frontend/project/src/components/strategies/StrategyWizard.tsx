import React, { useState } from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight, Save, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import '@/styles/strategy-wizard.css';

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
            <div>
              <label className="block text-sm font-medium mb-2 text-primary">Strateji Adı</label>
              <input
                {...methods.register('name')}
                className="modern-input w-full"
                placeholder="Örnek: BTC Takip Stratejisi"
              />
              {errors.name && (
                <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
              )}
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-2 text-primary">Cüzdan Adresi</label>
              <input
                {...methods.register('walletAddress')}
                className="modern-input w-full font-mono text-sm"
                placeholder="0x..."
              />
              {errors.walletAddress && (
                <p className="text-red-500 text-sm mt-1">{errors.walletAddress.message}</p>
              )}
            </div>
          </div>
        );

      case 'exchange':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium mb-3 text-primary">Borsa Seçimi</label>
              <div className="grid grid-cols-3 gap-3">
                {['OKX', 'Binance', 'Bybit'].map((exchange) => (
                  <button
                    key={exchange}
                    type="button"
                    onClick={() => setValue('exchange', exchange as any)}
                    className={`modern-button outline ${watchedValues.exchange === exchange ? 'primary' : ''}`}
                  >
                    <div className="font-medium">{exchange}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-3 text-primary">Kopyalama Modu</label>
              <div className="grid grid-cols-2 gap-3">
                {['Perpetual', 'Spot'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setValue('copyMode', mode as any)}
                    className={`modern-button outline ${watchedValues.copyMode === mode ? 'primary' : ''}`}
                  >
                    <div className="font-medium">{mode}</div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 'futures':
        return (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Leverage</label>
              <div className="flex items-center space-x-2">
                <input
                  type="range"
                  min="1"
                  max="125"
                  {...methods.register('leverage', { valueAsNumber: true })}
                  className="flex-1"
                />
                <span className="w-12 text-center font-medium">
                  {watchedValues.leverage}x
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Higher leverage increases risk and potential returns
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Margin Mode</label>
              <div className="grid grid-cols-2 gap-2">
                {['cross', 'isolated'].map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setValue('marginMode', mode as any)}
                    className={`p-3 border rounded-lg text-center transition-colors ${
                      watchedValues.marginMode === mode
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div className="font-medium capitalize">{mode}</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {mode === 'cross' ? 'Shared margin' : 'Isolated margin'}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                type="checkbox"
                {...methods.register('enableLiquidationProtection')}
                id="liquidation-protection"
              />
              <label htmlFor="liquidation-protection" className="text-sm">
                Enable liquidation protection
              </label>
            </div>
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
            <h3 className="text-lg font-semibold">Strategy Summary</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium text-sm text-gray-600">Basic Info</h4>
                <div className="mt-1 space-y-1 text-sm">
                  <div><span className="font-medium">Name:</span> {watchedValues.name}</div>
                  <div><span className="font-medium">Wallet:</span> 
                    <span className="font-mono text-xs">
                      {watchedValues.walletAddress?.slice(0, 6)}...{watchedValues.walletAddress?.slice(-4)}
                    </span>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-600">Exchange</h4>
                <div className="mt-1 space-y-1 text-sm">
                  <div><span className="font-medium">Platform:</span> {watchedValues.exchange}</div>
                  <div><span className="font-medium">Mode:</span> {watchedValues.copyMode}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-600">Futures Config</h4>
                <div className="mt-1 space-y-1 text-sm">
                  <div><span className="font-medium">Leverage:</span> {watchedValues.leverage}x</div>
                  <div><span className="font-medium">Margin:</span> {watchedValues.marginMode}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium text-sm text-gray-600">Risk Management</h4>
                <div className="mt-1 space-y-1 text-sm">
                  <div><span className="font-medium">Stop Loss:</span> {watchedValues.stopLoss || 'None'}%</div>
                  <div><span className="font-medium">Daily Limit:</span> {watchedValues.dailyLimit || 'None'}</div>
                </div>
              </div>
            </div>

            <Alert>
              <AlertDescription>
                <strong>Ready to create strategy!</strong> Please review all settings carefully. 
                Once created, the strategy will start monitoring the specified wallet address.
              </AlertDescription>
            </Alert>
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
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="space-y-4">
            {/* Step Navigation */}
            <div className="step-navigation">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={`step ${index === currentStep ? 'active' : index < currentStep ? 'completed' : ''}`}
                  onClick={() => index < currentStep && setCurrentStep(index)}
                >
                  <div className="step-number">
                    {index < currentStep ? '✓' : index + 1}
                  </div>
                  <div className="step-title">{step.title}</div>
                </div>
              ))}
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-primary">{steps[currentStep].title}</h2>
                <p className="text-sm text-secondary">{steps[currentStep].description}</p>
              </div>
              <Badge variant="outline" className="modern-badge primary">
                Adım {currentStep + 1} / {steps.length}
              </Badge>
            </div>
            
            <Progress value={((currentStep + 1) / steps.length) * 100} className="modern-progress" />
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-y-auto">
          <FormProvider {...methods}>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {renderStepContent()}

              <div className="flex items-center justify-between pt-4 border-t">
                <div className="flex items-center space-x-2">
                  {currentStep > 0 && (
                    <Button type="button" variant="outline" onClick={prevStep}>
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                  )}
                  
                  {currentStep === 0 && (
                    <Button type="button" variant="outline" onClick={loadDraft}>
                      Load Draft
                    </Button>
                  )}
                  
                  <Button type="button" variant="outline" onClick={saveDraft}>
                    <Save className="h-4 w-4 mr-1" />
                    Save Draft
                    {draftSaved && <span className="ml-1 text-green-600">✓</span>}
                  </Button>
                </div>

                <div className="flex items-center space-x-2">
                  {currentStep < steps.length - 1 ? (
                    <Button type="button" onClick={nextStep}>
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  ) : (
                    <Button type="submit" disabled={isSubmitting || !isValid}>
                      {isSubmitting ? 'Creating...' : 'Create Strategy'}
                    </Button>
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