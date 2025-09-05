import React, { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStrategiesStore } from '@/stores/strategiesStore';
import { CreateStrategyDialog } from '@/components/CreateStrategyDialog';
import { Plus, Edit, Trash2, Power, PowerOff, ExternalLink } from 'lucide-react';

export function StrategiesPage() {
  const { strategies, updateStrategy, deleteStrategy, recentTrades, fetchStrategies } = useStrategiesStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
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
        <Accordion type="single" collapsible className="space-y-4">
          {strategies.map((strategy) => (
            <AccordionItem 
              key={strategy.id} 
              value={strategy.id}
              className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50 rounded-lg overflow-hidden"
            >
              <AccordionTrigger className="px-6 py-4 hover:no-underline">
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
                      <div className={`font-semibold ${strategy.totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(strategy.totalPnL)}
                      </div>
                      <p className="text-xs text-slate-400">Total PnL</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={strategy.isActive ? "default" : "secondary"}>
                        {strategy.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleStrategyActive(strategy.id, strategy.isActive);
                        }}
                        className="text-slate-400 hover:text-white"
                      >
                        {strategy.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4" />}
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-slate-400 hover:text-white"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteStrategy(strategy.id);
                        }}
                        className="text-slate-400 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-6 pb-6">
                <div className="space-y-6">
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
                      <p className={`text-sm font-medium ${strategy.currentPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {formatCurrency(strategy.currentPnL)}
                      </p>
                    </div>
                    <div className="p-4 bg-slate-700/30 rounded-lg">
                      <p className="text-xs text-slate-400 mb-1">Total Trades</p>
                      <p className="text-sm text-white font-medium">{strategy.tradesCount}</p>
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
                          <span className="text-white ml-2">{strategy.percentageToCopy}%</span>
                        </div>
                      )}
                      {strategy.leverage && (
                        <div>
                          <span className="text-slate-400">Leverage:</span>
                          <span className="text-white ml-2">{strategy.leverage}x</span>
                        </div>
                      )}
                      {strategy.stopLoss && (
                        <div>
                          <span className="text-slate-400">Stop Loss:</span>
                          <span className="text-white ml-2">{strategy.stopLoss}%</span>
                        </div>
                      )}
                      {strategy.dailyLimit && (
                        <div>
                          <span className="text-slate-400">Daily Limit:</span>
                          <span className="text-white ml-2">{strategy.dailyLimit} trades</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Recent Trades */}
                  <div>
                    <h4 className="text-sm font-medium text-white mb-3">Recent Trades</h4>
                    <div className="bg-slate-700/20 rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader>
                          <TableRow className="border-slate-700">
                            <TableHead className="text-slate-400">Time</TableHead>
                            <TableHead className="text-slate-400">Action</TableHead>
                            <TableHead className="text-slate-400">Token</TableHead>
                            <TableHead className="text-slate-400">Amount</TableHead>
                            <TableHead className="text-slate-400">PnL</TableHead>
                            <TableHead className="text-slate-400">Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getStrategyTrades(strategy.id).slice(0, 5).map((trade) => (
                            <TableRow key={trade.id} className="border-slate-700">
                              <TableCell className="text-slate-300">
                                {new Date(trade.timestamp).toLocaleString()}
                              </TableCell>
                              <TableCell>
                                <Badge 
                                  variant={trade.action === 'BUY' ? 'default' : 'secondary'}
                                  className={trade.action === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}
                                >
                                  {trade.action}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-slate-300 font-medium">{trade.token}</TableCell>
                              <TableCell className="text-slate-300">{formatCurrency(trade.amount)}</TableCell>
                              <TableCell className={trade.pnl && trade.pnl > 0 ? 'text-emerald-400' : 'text-red-400'}>
                                {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                              </TableCell>
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