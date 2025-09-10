import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
import { useStrategiesStore } from '@/stores/strategiesStore';
import { HelpCircle } from 'lucide-react';

const strategySchema = z.object({
  name: z.string().min(1, 'Strategy name is required'),
  walletAddress: z.string().min(42, 'Invalid wallet address'),
  exchange: z.enum(['OKX', 'Binance', 'Bybit']),
  apiKey: z.string().min(1, 'API key is required'),
  apiSecret: z.string().min(1, 'API secret is required'),
  passphrase: z.string().optional(),
  copyMode: z.enum(['Perpetual', 'Spot']),
  sizingMethod: z.enum(['Fixed Amount', 'Percentage of Wallet\'s Trade']),
  amountPerTrade: z.number().optional(),
  percentageToCopy: z.number().optional(),
  leverage: z.number().optional(),
  onChainSellAction: z.string().optional(),
  stopLoss: z.number().optional(),
  dailyTradeLimit: z.number().optional(),
  allowedTokens: z.string().optional(),
});

type StrategyForm = z.infer<typeof strategySchema>;

interface CreateStrategyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CreateStrategyDialog({ open, onOpenChange }: CreateStrategyDialogProps) {
  const [selectedExchange, setSelectedExchange] = useState<'OKX' | 'Binance' | 'Bybit' | null>(null);
  const [currentTab, setCurrentTab] = useState('basics');
  const [leverage, setLeverage] = useState([5]);
  const [isPerpetual, setIsPerpetual] = useState(false);
  const { addStrategy } = useStrategiesStore();

  const { register, handleSubmit, watch, setValue, formState: { errors, isSubmitting } } = useForm<StrategyForm>({
    resolver: zodResolver(strategySchema),
    defaultValues: {
      leverage: 5,
      copyMode: 'Spot',
    }
  });

  const sizingMethod = watch('sizingMethod');

  const handleCopyModeChange = (checked: boolean) => {
    setIsPerpetual(checked);
    setValue('copyMode', checked ? 'Perpetual' : 'Spot');
  };

  const onSubmit = async (data: StrategyForm) => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    addStrategy({
      name: data.name,
      walletAddress: data.walletAddress,
      exchange: data.exchange,
      copyMode: data.copyMode,
      isActive: true,
      currentPnL: 0,
      totalPnL: 0,
      tradesCount: 0,
      leverage: data.leverage,
      stopLoss: data.stopLoss,
      dailyLimit: data.dailyTradeLimit,
      sizingMethod: data.sizingMethod,
      amountPerTrade: data.amountPerTrade,
      percentageToCopy: data.percentageToCopy,
      allowedTokens: data.allowedTokens ? data.allowedTokens.split(',').map(t => t.trim()) : undefined,
      apiKey: data.apiKey,
      apiSecret: data.apiSecret,
      passphrase: data.passphrase,
    });

    onOpenChange(false);
    setSelectedExchange(null);
    setCurrentTab('basics');
    setIsPerpetual(false);
  };

  const handleExchangeSelect = (exchange: 'OKX' | 'Binance' | 'Bybit') => {
    setSelectedExchange(exchange);
    setValue('exchange', exchange);
    setCurrentTab('basics');
  };

  const exchanges = [
    { name: 'OKX', logo: '⚫', description: 'Global crypto exchange' },
    { name: 'Binance', logo: '🟡', description: 'World\'s largest exchange' },
    { name: 'Bybit', logo: '🟠', description: 'Derivatives specialist' },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto bg-slate-900 border-slate-700">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-white">
            Create New Strategy
          </DialogTitle>
        </DialogHeader>

        {!selectedExchange ? (
          <div className="py-8">
            <h3 className="text-lg font-medium text-white mb-6 text-center">
              Choose Your Exchange
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {exchanges.map((exchange) => (
                <Card
                  key={exchange.name}
                  className="bg-slate-800/50 border-slate-700 hover:border-emerald-400/50 cursor-pointer transition-all duration-200"
                  onClick={() => handleExchangeSelect(exchange.name as any)}
                >
                  <CardContent className="p-8 text-center">
                    <div className="text-4xl mb-4">{exchange.logo}</div>
                    <h4 className="text-xl font-bold text-white mb-2">{exchange.name}</h4>
                    <p className="text-slate-400">{exchange.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)}>
            <Tabs value={currentTab} onValueChange={setCurrentTab}>
              <TabsList className="grid w-full grid-cols-4 mb-8 bg-slate-800">
                <TabsTrigger value="basics" className="data-[state=active]:bg-emerald-600">Basics</TabsTrigger>
                <TabsTrigger value="trading" className="data-[state=active]:bg-emerald-600">Trading</TabsTrigger>
                <TabsTrigger value="risk" className="data-[state=active]:bg-emerald-600">Risk</TabsTrigger>
                <TabsTrigger value="advanced" className="data-[state=active]:bg-emerald-600">Advanced</TabsTrigger>
              </TabsList>

              <TabsContent value="basics" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-white">Strategy Name</Label>
                    <Input
                      {...register('name')}
                      placeholder="e.g., DeFi Whale Copy"
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                    {errors.name && (
                      <p className="text-red-400 text-sm">{errors.name.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="walletAddress" className="text-white">Wallet to Copy</Label>
                    <Input
                      {...register('walletAddress')}
                      placeholder="0x..."
                      className="bg-slate-800 border-slate-600 text-white font-mono"
                    />
                    {errors.walletAddress && (
                      <p className="text-red-400 text-sm">{errors.walletAddress.message}</p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="p-4 bg-slate-800/30 rounded-lg">
                    <h4 className="text-white font-medium mb-4">API Configuration for {selectedExchange}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey" className="text-white">API Key</Label>
                    <Input
                      {...register('apiKey')}
                      placeholder="Your API key"
                      className="bg-slate-800 border-slate-600 text-white font-mono"
                    />
                    {errors.apiKey && (
                      <p className="text-red-400 text-sm">{errors.apiKey.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="apiSecret" className="text-white">API Secret</Label>
                    <Input
                      {...register('apiSecret')}
                      type="password"
                      placeholder="Your API secret"
                      className="bg-slate-800 border-slate-600 text-white font-mono"
                    />
                    {errors.apiSecret && (
                      <p className="text-red-400 text-sm">{errors.apiSecret.message}</p>
                    )}
                  </div>
                    
                    {selectedExchange === 'OKX' && (
                      <div className="space-y-2 md:col-span-2">
                        <Label htmlFor="passphrase" className="text-white">Passphrase</Label>
                        <Input
                          {...register('passphrase')}
                          type="password"
                          placeholder="Your API passphrase"
                          className="bg-slate-800 border-slate-600 text-white font-mono"
                        />
                        {errors.passphrase && (
                          <p className="text-red-400 text-sm">{errors.passphrase.message}</p>
                        )}
                      </div>
                    )}
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="trading" className="space-y-6">
                <div className="space-y-4">
                  <div className="p-4 bg-slate-800/50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-white text-lg">Copy Mode</Label>
                        <p className="text-sm text-slate-400 mt-1">
                          {isPerpetual ? 'Perpetual Futures - Copy leveraged positions with higher risk/reward' : 'Spot Trading - Copy spot trades with direct asset ownership'}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4">
                        <span className={`text-sm ${!isPerpetual ? 'text-white font-medium' : 'text-slate-400'}`}>
                          Spot
                        </span>
                        <Switch
                          checked={isPerpetual}
                          onCheckedChange={handleCopyModeChange}
                        />
                        <span className={`text-sm ${isPerpetual ? 'text-white font-medium' : 'text-slate-400'}`}>
                          Perpetual
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Label className="text-white text-lg">Sizing Method</Label>
                    <HelpCircle className="w-4 h-4 text-slate-400" />
                  </div>
                  <Select onValueChange={(value) => setValue('sizingMethod', value as any)}>
                    <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                      <SelectValue placeholder="Choose sizing method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Fixed Amount">Fixed Amount per Trade</SelectItem>
                      <SelectItem value="Percentage of Wallet's Trade">Percentage of Wallet's Trade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {sizingMethod === 'Fixed Amount' && (
                  <div className="space-y-2">
                    <Label htmlFor="amountPerTrade" className="text-white">Amount per Trade (USDT)</Label>
                    <Input
                      {...register('amountPerTrade', { valueAsNumber: true })}
                      type="number"
                      placeholder="500"
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                )}

                {sizingMethod === "Percentage of Wallet's Trade" && (
                  <div className="space-y-2">
                    <Label htmlFor="percentageToCopy" className="text-white">Percentage to Copy (%)</Label>
                    <Input
                      {...register('percentageToCopy', { valueAsNumber: true })}
                      type="number"
                      placeholder="10"
                      min="1"
                      max="100"
                      className="bg-slate-800 border-slate-600 text-white"
                    />
                  </div>
                )}
              </TabsContent>

              <TabsContent value="risk" className="space-y-6">
                {isPerpetual && (
                  <>
                    <div className="space-y-4">
                      <Label className="text-white text-lg">Leverage</Label>
                      <div className="space-y-4">
                        <Slider
                          value={leverage}
                          onValueChange={setLeverage}
                          max={20}
                          min={1}
                          step={1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-sm text-slate-400">
                          <span>1x</span>
                          <span className="text-white font-medium">{leverage[0]}x</span>
                          <span>20x</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-white">On-Chain Sell Action</Label>
                      <Select onValueChange={(value) => setValue('onChainSellAction', value)}>
                        <SelectTrigger className="bg-slate-800 border-slate-600 text-white">
                          <SelectValue placeholder="Choose action" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Close Position Only">Close Position Only</SelectItem>
                          <SelectItem value="Close and Flip to SHORT">Close and Flip to SHORT</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}

                <div className="space-y-2">
                  <Label htmlFor="stopLoss" className="text-white">Stop Loss (%)</Label>
                  <Input
                    {...register('stopLoss', { valueAsNumber: true })}
                    type="number"
                    placeholder="5"
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="dailyTradeLimit" className="text-white">Daily Trade Limit</Label>
                  <Input
                    {...register('dailyTradeLimit', { valueAsNumber: true })}
                    type="number"
                    placeholder="10"
                    className="bg-slate-800 border-slate-600 text-white"
                  />
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="allowedTokens" className="text-white">Allowed Tokens (Optional)</Label>
                  <Textarea
                    {...register('allowedTokens')}
                    placeholder="BTC, ETH, SOL (leave empty to copy all tokens)"
                    className="bg-slate-800 border-slate-600 text-white"
                    rows={3}
                  />
                  <p className="text-sm text-slate-400">
                    Comma-separated list of token symbols. Leave empty to copy all tokens.
                  </p>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-between mt-8 pt-6 border-t border-slate-700">
              <Button
                type="button"
                variant="ghost"
                onClick={() => onOpenChange(false)}
                className="text-slate-400 hover:text-white"
              >
                Cancel
              </Button>
              <div className="space-x-4">
                {currentTab !== 'basics' && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      const tabs = ['basics', 'trading', 'risk', 'advanced'];
                      const currentIndex = tabs.indexOf(currentTab);
                      if (currentIndex > 0) {
                        setCurrentTab(tabs[currentIndex - 1]);
                      }
                    }}
                    className="border-slate-600 text-slate-300 hover:text-white"
                  >
                    Previous
                  </Button>
                )}
                {currentTab !== 'advanced' ? (
                  <Button
                    type="button"
                    onClick={() => {
                      const tabs = ['basics', 'trading', 'risk', 'advanced'];
                      const currentIndex = tabs.indexOf(currentTab);
                      if (currentIndex < tabs.length - 1) {
                        setCurrentTab(tabs[currentIndex + 1]);
                      }
                    }}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    Next
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-emerald-500 hover:bg-emerald-600"
                  >
                    {isSubmitting ? 'Creating...' : 'Create Strategy'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
