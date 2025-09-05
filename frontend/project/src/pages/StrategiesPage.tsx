import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStrategiesStore } from '@/stores/strategiesStore';
import { getStrategyTrades } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { CreateStrategyDialog } from '@/components/CreateStrategyDialog';
import { formatCurrency, safeNumber } from '@/lib/utils';
import { Plus, Edit, Trash2, Power, PowerOff, ExternalLink } from 'lucide-react';

export function StrategiesPage() {
  const { strategies, updateStrategy, deleteStrategy, recentTrades, fetchStrategies, isLoading } = useStrategiesStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [searchParams] = useSearchParams();
  const openStrategyId = searchParams.get('open');

  const [tradesLoading, setTradesLoading] = useState<Record<string, boolean>>({});
  const [tradesByStrategy, setTradesByStrategy] = useState<Record<string, any[]>>({});

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const loadTrades = async (strategyId: string) => {
    if (tradesLoading[strategyId]) return;
    setTradesLoading((s) => ({ ...s, [strategyId]: true }));
    try {
      const res = await getStrategyTrades(strategyId);
      const trades = (res as any).data;
      setTradesByStrategy((s) => ({ ...s, [strategyId]: Array.isArray(trades) ? trades : [] }));
    } catch {
      setTradesByStrategy((s) => ({ ...s, [strategyId]: [] }));
    } finally {
      setTradesLoading((s) => ({ ...s, [strategyId]: false }));
    }
  };

  const toggleStrategyActive = (id: string, currentStatus: boolean) => {
    updateStrategy(id, { isActive: !currentStatus });
  };

  const getStrategyTrades = (strategyId: string) => {
    return recentTrades.filter(trade => trade.strategyId === strategyId);
  };

  const getExchangeLogo = (exchange: string) => {
    const logos = {
      'Binance': '🟡',
      'OKX': '⚫',
      'Bybit': '🟠'
    };
    return logos[exchange as keyof typeof logos] || '⚪';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading strategies...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">My Strategies</h1>
          <p className="text-slate-400">Manage your copy trading strategies</p>
        </div>
        <Button 
          onClick={() => setIsCreateDialogOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-white"
        >
          <Plus className="w-5 h-5 mr-2" />
          Create Strategy
        </Button>
      </div>

      {strategies.length === 0 ? (
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
          <CardContent className="py-16">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-700 rounded-full flex items-center justify-center">
                <Plus className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No strategies yet</h3>
              <p className="text-slate-400 mb-6">
                Create your first copy trading strategy to get started
              </p>
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-emerald-500 hover:bg-emerald-600 text-white"
              >
                Create Your First Strategy
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Accordion 
          type="single" 
          collapsible 
          className="space-y-4"
          defaultValue={openStrategyId || undefined}
        >
          {strategies.map((strategy) => (
            <AccordionItem 
              key={strategy.id} 
              value={strategy.id}
              className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline" onClick={() => loadTrades(strategy.id)}>
                <div className="flex items-center justify-between w-full mr-4">
                  <div className="flex items-center gap-4">
                    <div className="text-2xl">{getExchangeLogo(strategy.exchange)}</div>
                    <div className="text-left">
                      <h3 className="text-lg font-semibold text-white">{strategy.name}</h3>
                      <p className="text-sm text-slate-400">{strategy.exchange} • {strategy.copyMode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className={`font-semibold ${safeNumber(strategy.totalPnL) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(strategy.totalPnL)}
                      </div>
                      <p className="text-xs text-slate-400">Total PnL</p>
                    </div>
                      <Badge variant={strategy.isActive ? "default" : "secondary"}>
                        {strategy.isActive ? "Active" : "Inactive"}
                      </Badge>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
                  {/* Actions */}
                  <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                      onClick={() => toggleStrategyActive(strategy.id, strategy.isActive)}
                        className="text-slate-400 hover:text-white"
                      >
                        {strategy.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                      </Button>
                    <Button size="sm" variant="ghost" className="text-slate-400 hover:text-white">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                      onClick={() => deleteStrategy(strategy.id)}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  {/* Strategy Details */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Wallet Address</p>
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-white font-mono">
                          {strategy.walletAddress.slice(0, 6)}...{strategy.walletAddress.slice(-4)}
                        </p>
                        <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400">
                          <ExternalLink className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Current PnL</p>
                      <p className={`text-sm font-medium ${safeNumber(strategy.currentPnL) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(strategy.currentPnL)}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Total Trades</p>
                      <p className="text-sm text-white font-medium">{safeNumber(strategy.tradesCount)}</p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Created</p>
                      <p className="text-sm text-white">{new Date(strategy.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>

                  {/* Strategy Settings */}
                  <div className="p-4 bg-slate-700/20 rounded-lg">
                    <h4 className="text-sm font-medium text-white mb-3">Strategy Configuration</h4>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-slate-400">Sizing Method:</span>
                        <span className="text-white ml-2">{strategy.sizingMethod}</span>
                      </div>
                      {strategy.amountPerTrade && (
                        <div>
                          <span className="text-slate-400">Amount per Trade:</span>
                          <span className="text-white ml-2">{formatCurrency(strategy.amountPerTrade)}</span>
                        </div>
                      )}
                      {strategy.percentageToCopy && (
                        <div>
                          <span className="text-slate-400">Copy Percentage:</span>
                          <span className="text-white ml-2">{safeNumber(strategy.percentageToCopy)}%</span>
                        </div>
                      )}
                      {strategy.leverage && (
                        <div>
                          <span className="text-slate-400">Leverage:</span>
                          <span className="text-white ml-2">{safeNumber(strategy.leverage)}x</span>
                        </div>
                      )}
                      {strategy.stopLoss && (
                        <div>
                          <span className="text-slate-400">Stop Loss:</span>
                          <span className="text-white ml-2">{safeNumber(strategy.stopLoss)}%</span>
                        </div>
                      )}
                      {strategy.dailyLimit && (
                        <div>
                          <span className="text-slate-400">Daily Limit:</span>
                          <span className="text-white ml-2">{safeNumber(strategy.dailyLimit)} trades</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Trades */}
                  <div>
                    <h4 className="text-sm font-medium text-white mb-3">Recent Trades</h4>
                    <div className="bg-slate-700/20 rounded-lg overflow-hidden">
                      {tradesLoading[strategy.id] ? (
                        <div className="p-4">
                          <Skeleton className="h-10 w-full mb-2" />
                          <Skeleton className="h-10 w-full mb-2" />
                          <Skeleton className="h-10 w-full" />
                        </div>
                      ) : (
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                              <TableHead className="text-slate-400">Date</TableHead>
                            <TableHead className="text-slate-400">Action</TableHead>
                            <TableHead className="text-slate-400">Token</TableHead>
                              <TableHead className="text-slate-400">Amount ($)</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(!tradesByStrategy[strategy.id] || tradesByStrategy[strategy.id].length === 0) ? (
                              <TableRow>
                                <TableCell colSpan={5} className="text-center text-slate-400">No trades have been executed for this strategy yet.</TableCell>
                              </TableRow>
                            ) : tradesByStrategy[strategy.id].map((trade) => (
                            <TableRow key={trade.id} className="border-slate-700">
                                <TableCell className="text-slate-300">{new Date(trade.date || trade.createdAt).toLocaleString()}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={trade.action === 'BUY' ? 'default' : 'secondary'}
                                  className={trade.action === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}
                                >
                                  {trade.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-300 font-medium">{trade.token}</TableCell>
                              <TableCell className="text-slate-300">{formatCurrency(safeNumber(trade.amount))}</TableCell>
                              <TableCell>
                                <Badge 
                                  variant={trade.status === 'Success' ? 'default' : 'destructive'}
                                  className={trade.status === 'Success' ? 'bg-emerald-600' : 'bg-red-600'}
                                >
                                  {trade.status}
                                </Badge>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      )}
                    </div>
                  </div>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      )}

      <CreateStrategyDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </div>
  );
}