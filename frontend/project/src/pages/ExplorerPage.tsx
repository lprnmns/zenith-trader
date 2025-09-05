import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatCurrency, formatPercentage, safeNumber } from '@/lib/utils';
import { Search, ExternalLink, Copy, Star, Shield } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { getSuggestedWallets, getWalletAnalysis } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

export function ExplorerPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1D');
  const [performanceData, setPerformanceData] = useState<{ date: string; value: number }[]>([]);
  const [tradeHistory, setTradeHistory] = useState<any[]>([]);
  const [summary, setSummary] = useState<{ winRatePercent: number; totalTrades: number; avgTradeSizeUsd: number } | null>(null);
  const [sortBy, setSortBy] = useState<'consistency' | 'smartScore' | 'pnl1d' | 'pnl7d' | 'pnl30d' | 'pnl180d' | 'pnl365d'>('consistency');
  const [copied, setCopied] = useState<string | null>(null);
  const [suggested, setSuggested] = useState<any[]>([]);
  const [loadingSuggested, setLoadingSuggested] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await getSuggestedWallets();
        setSuggested(res.data);
      } catch (e) {
        setSuggested([]);
      } finally {
        setLoadingSuggested(false);
      }
    })();
  }, []);

  const handleAnalyze = async () => {
    if (!walletAddress.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await getWalletAnalysis(walletAddress.trim());
      const data = res.data || {};
      setSummary(data.summary || null);
      const chart = Array.isArray(data.cumulativePnlChart) ? data.cumulativePnlChart.map((p: any) => ({ date: p.date, value: p.cumulativePnl })) : [];
      setPerformanceData(chart);
      setTradeHistory(Array.isArray(data.tradeHistory) ? data.tradeHistory : []);
      setHasAnalyzed(true);
    } catch (e) {
      setPerformanceData([]);
      setTradeHistory([]);
      setSummary(null);
      setHasAnalyzed(false);
    } finally {
    setIsAnalyzing(false);
    }
  };

  const formatShort = (addr: string) => (addr.length > 10 ? `${addr.slice(0, 6)}...${addr.slice(-4)}` : addr);

  const handleCopy = async (addr: string) => {
    try {
      await navigator.clipboard.writeText(addr);
      setCopied(addr);
      setTimeout(() => setCopied(null), 1200);
    } catch {}
  };

  const filteredAndSorted = useMemo(() => {
    const list = suggested as any[];
    const byKey = (w: any) => {
      switch (sortBy) {
        case 'consistency': return w.consistencyScore ?? -Infinity;
        case 'pnl1d': return w.pnlPercent1d ?? -Infinity;
        case 'pnl7d': return w.pnlPercent7d ?? -Infinity;
        case 'pnl30d': return w.pnlPercent30d ?? -Infinity;
        case 'pnl180d': return w.pnlPercent180d ?? -Infinity;
        case 'pnl365d': return w.pnlPercent365d ?? -Infinity;
        default: return w.smartScore ?? -Infinity;
      }
    };
    return [...list].sort((a, b) => (byKey(b) as number) - (byKey(a) as number));
  }, [suggested, sortBy]);

  // Summary
  const totalPnL = performanceData.length > 0 ? safeNumber(performanceData[performanceData.length - 1]?.value ?? 0) : 0;
  const winRate = safeNumber(summary?.winRatePercent ?? 0);
  const totalTradesCount = safeNumber(summary?.totalTrades ?? 0);
  const avgTradeSize = safeNumber(summary?.avgTradeSizeUsd ?? 0);
  const toggleExpand = (id: string) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Wallet Explorer</h1>
        <p className="text-slate-400">Analyze any wallet's trading performance and copy their strategies</p>
      </div>

      {/* Wallet Input */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Input
              placeholder="Enter wallet address (0x...)"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              className="flex-1 h-12 bg-slate-700/50 border-slate-600 focus:border-emerald-400 text-white placeholder:text-slate-400"
            />
            <Button onClick={handleAnalyze} disabled={!walletAddress.trim() || isAnalyzing} className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600">
              {isAnalyzing ? 'Analyzing...' : (<><Search className="w-5 h-5 mr-2" />Analyze</>)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Suggested Wallets shown initially (above results) until analyze is clicked) */}
      {!hasAnalyzed && (
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <Star className="w-5 h-5 text-emerald-400" /> Suggested Wallets
            </CardTitle>
            <div className="flex items-center gap-3">
              {/* category tabs removed; backend supplies final ranking */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 text-sm">Sort by</span>
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as any)}>
                  <SelectTrigger className="w-48 bg-slate-700/50 border-slate-600">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-slate-200">
                    <SelectItem value="consistency">Consistency (desc)</SelectItem>
                    <SelectItem value="smartScore">Smart Score (desc)</SelectItem>
                    <SelectItem value="pnl1d">1D PnL% (desc)</SelectItem>
                    <SelectItem value="pnl7d">7D PnL% (desc)</SelectItem>
                    <SelectItem value="pnl30d">30D PnL% (desc)</SelectItem>
                    <SelectItem value="pnl180d">6M PnL% (desc)</SelectItem>
                    <SelectItem value="pnl365d">1Y PnL% (desc)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          {loadingSuggested ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : (
          <Accordion type="single" collapsible className="w-full">
            {filteredAndSorted.map((w, idx) => (
                <AccordionItem key={w.address || w.id || idx} value={String(w.address || w.id || idx)} className="border-b border-slate-700/60">
                <AccordionTrigger className="hover:no-underline">
                  <div className="w-full grid grid-cols-12 items-center gap-3 text-left">
                    <div className="col-span-1 text-slate-400 text-sm">#{idx + 1}</div>
                    <div className="col-span-3">
                        <div className="text-white font-medium">{w.name || 'Wallet'}</div>
                        <div className="text-slate-400 text-xs">{w.address}</div>
                    </div>
                    <div className="col-span-2">
                        <div className="text-slate-400 text-xs">Open Positions</div>
                        <div className="text-white font-semibold">{w.openPositionsCount ?? 0}</div>
                      </div>
                      <div className="col-span-1">
                        <div className="text-slate-400 text-xs">1D %</div>
                        <div className={`font-semibold ${Number(w.pnlPercent1d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{w.pnlPercent1d == null ? '-' : `${Number(w.pnlPercent1d).toFixed(2)}%`}</div>
                      </div>
                      <div className="col-span-1">
                        <div className="text-slate-400 text-xs">7D %</div>
                        <div className={`font-semibold ${Number(w.pnlPercent7d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{w.pnlPercent7d == null ? '-' : `${Number(w.pnlPercent7d).toFixed(2)}%`}</div>
                      </div>
                      <div className="col-span-1">
                        <div className="text-slate-400 text-xs">30D %</div>
                        <div className={`font-semibold ${Number(w.pnlPercent30d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{w.pnlPercent30d == null ? '-' : `${Number(w.pnlPercent30d).toFixed(2)}%`}</div>
                      </div>
                      <div className="col-span-1">
                        <div className="text-slate-400 text-xs">6M %</div>
                        <div className={`font-semibold ${Number(w.pnlPercent180d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{w.pnlPercent180d == null ? '-' : `${Number(w.pnlPercent180d).toFixed(2)}%`}</div>
                      </div>
                      <div className="col-span-1">
                        <div className="text-slate-400 text-xs">1Y %</div>
                        <div className={`font-semibold ${Number(w.pnlPercent365d ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{w.pnlPercent365d == null ? '-' : `${Number(w.pnlPercent365d).toFixed(2)}%`}</div>
                    </div>
                      <div className="col-span-1">
                        <Badge className={w.riskLevel === 'Low' ? 'bg-emerald-500' : w.riskLevel === 'Medium' ? 'bg-yellow-500' : 'bg-red-500'}>
                          {w.riskLevel || 'Medium'}
                      </Badge>
                      </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="py-4">
                    <div className="flex items-center gap-3 mb-3">
                        <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={(e) => { e.preventDefault(); setWalletAddress(w.address); handleAnalyze(); }}>
                        Analyze this wallet
                      </Button>
                        <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white" onClick={(e) => { e.preventDefault(); window.open(`https://etherscan.io/address/${w.address}`, '_blank'); }}>
                        <ExternalLink className="w-4 h-4 mr-1" /> View on explorer
                      </Button>
                        <Button size="sm" variant="ghost" className="text-slate-300 hover:text-white" onClick={(e) => { e.preventDefault(); handleCopy(w.address); }} title="Copy address">
                          <Copy className="w-4 h-4 mr-1" /> Copy address
                        </Button>
                        {copied === w.address && (<span className="text-emerald-400 text-xs">Copied</span>)}
                    </div>
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          )}
        </CardContent>
      </Card>
      )}

      {isAnalyzing && (
        <div className="space-y-4">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-80 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      )}

      {hasAnalyzed && !isAnalyzing && (
        <>
          {/* Wallet Summary */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">Total PnL (Cumulative)</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(totalPnL)}</div>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">Win Rate</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">{formatPercentage(winRate).replace('+','')}</div>
                <p className="text-xs text-slate-400">Over realized sales</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">Total Trades</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">{totalTradesCount}</div>
                <p className="text-xs text-slate-400">Realized (SELL) trades</p>
              </CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">Avg Trade Size</CardTitle></CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white mb-1">{formatCurrency(avgTradeSize)}</div>
                <p className="text-xs text-slate-400">Per transaction</p>
              </CardContent>
            </Card>
          </div>

          {/* Cumulative PnL Chart */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader>
              <div className="flex items-center justify-between"><CardTitle className="text-white">Cumulative PnL</CardTitle></div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%"><LineChart data={performanceData}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} /><YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} /><Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F3F4F6' }} formatter={(value) => [formatCurrency(value as number), 'PnL (USD)']} /><Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={true} /></LineChart></ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Suggested Wallets moved below all analysis blocks */}

          {/* Position Ledger */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader>
              <CardTitle className="text-white">Position Ledger</CardTitle>
              <p className="text-sm text-slate-400">Focused view with Open Positions and Trade History</p>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="open_positions" className="w-full">
                <TabsList className="bg-slate-700/50">
                  <TabsTrigger value="open_positions" className="data-[state=active]:bg-emerald-600">Open Positions</TabsTrigger>
                  <TabsTrigger value="history" className="data-[state=active]:bg-emerald-600">Trade History</TabsTrigger>
                </TabsList>

                <TabsContent value="open_positions" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700">
                    <TableHead className="text-slate-400">Date</TableHead>
                    <TableHead className="text-slate-400">Asset</TableHead>
                        <TableHead className="text-slate-400">Cost / Unit</TableHead>
                        <TableHead className="text-slate-400">Amount ($)</TableHead>
                        <TableHead className="text-slate-400">Unrealized PnL ($)</TableHead>
                        <TableHead className="text-slate-400">Unrealized PnL (%)</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                      {(() => {
                        const openRows = (tradeHistory || []).filter((r: any) => {
                          const s = String(r.status || '').toUpperCase();
                          return s === 'OPEN' || s === 'PARTIALLY_CLOSED';
                        });
                        if (openRows.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={7} className="text-center text-slate-400">There are no open positions.</TableCell>
                            </TableRow>
                          );
                        }
                        return openRows.map((row: any, idx: number) => {
                          const status = String(row.status || '').toUpperCase();
                          const rowColor = status === 'PARTIALLY_CLOSED' ? 'bg-yellow-500/10' : '';
                          const id = row.id || `${row.date}-${row.asset}-${idx}`;
                          const isOpen = !!expanded[id];
                          const expandable = status === 'PARTIALLY_CLOSED' && Array.isArray(row.sales) && row.sales.length > 0;
                          return (
                            <React.Fragment key={id}>
                              <TableRow className={`border-slate-700 ${rowColor} ${expandable ? 'cursor-pointer' : ''}`} onClick={() => expandable && toggleExpand(id)}>
                                <TableCell className="text-slate-300">{row.date}</TableCell>
                                <TableCell className="text-slate-300 font-medium">{row.asset}</TableCell>
                                <TableCell className="text-slate-300">{row.costPerUnit != null ? formatCurrency(safeNumber(row.costPerUnit)) : '-'}</TableCell>
                                <TableCell className="text-slate-300">{formatCurrency(Number(safeNumber(row.amountUsd)).toFixed(2) as any)}</TableCell>
                                <TableCell className={`${(row.unrealizedPnlUsd ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {row.unrealizedPnlUsd == null ? '-' : formatCurrency(Number(Number(row.unrealizedPnlUsd).toFixed(2)))}
                      </TableCell>
                                <TableCell className={`${(row.unrealizedPnlPercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                  {row.unrealizedPnlPercent == null ? '-' : `${Number(row.unrealizedPnlPercent).toFixed(2)}%`}
                      </TableCell>
                                <TableCell className="text-slate-300">{status.replace('_',' ')}</TableCell>
                              </TableRow>
                              {isOpen && expandable && (
                                <TableRow className="border-slate-700">
                                  <TableCell colSpan={7}>
                                    <div className="bg-slate-900/50 rounded-md p-3">
                                      <div className="text-slate-400 text-sm mb-2">Sales</div>
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-slate-800">
                                            <TableHead className="text-slate-500">Date</TableHead>
                                            <TableHead className="text-slate-500">Amount Sold ($)</TableHead>
                                            <TableHead className="text-slate-500">Realized PnL ($)</TableHead>
                                            <TableHead className="text-slate-500">Realized PnL (%)</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {row.sales.map((s: any, i: number) => (
                                            <TableRow key={`${id}-sale-${i}`} className="border-slate-800">
                                              <TableCell className="text-slate-300">{s.date}</TableCell>
                                              <TableCell className="text-slate-300">{formatCurrency(safeNumber(s.amountSoldUsd))}</TableCell>
                                              <TableCell className={`${safeNumber(s.realizedPnlUsd) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(safeNumber(s.realizedPnlUsd))}</TableCell>
                                              <TableCell className={`${safeNumber(s.realizedPnlPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{s.realizedPnlPercent == null ? '-' : formatPercentage(safeNumber(s.realizedPnlPercent))}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </TabsContent>

                <TabsContent value="history" className="mt-4">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700">
                        <TableHead className="text-slate-400">Close Date</TableHead>
                        <TableHead className="text-slate-400">Asset</TableHead>
                        <TableHead className="text-slate-400">Total Investment ($)</TableHead>
                        <TableHead className="text-slate-400">Realized PnL ($)</TableHead>
                        <TableHead className="text-slate-400">Realized PnL (%)</TableHead>
                        <TableHead className="text-slate-400">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(() => {
                        const closedRows = (tradeHistory || [])
                          .filter((r: any) => {
                            const s = String(r.status || '').toUpperCase();
                            return s === 'CLOSED_PROFIT' || s === 'CLOSED_LOSS';
                          })
                          .map((r: any) => {
                            const totalRealizedUsd = (Array.isArray(r.sales) ? r.sales : []).reduce((sum: number, s: any) => sum + Number(s.realizedPnlUsd || 0), 0);
                            const cost = Number(r.amountUsd || 0);
                            const totalRealizedPct = cost > 0 ? (totalRealizedUsd / cost) * 100 : 0;
                            const lastSaleDate = (Array.isArray(r.sales) ? r.sales : []).slice().sort((a: any, b: any) => (b.date || '').localeCompare(a.date || ''))[0]?.date || r.date;
                            return { ...r, totalRealizedUsd, totalRealizedPct, lastSaleDate };
                          })
                          .sort((a: any, b: any) => (b.lastSaleDate || '').localeCompare(a.lastSaleDate || ''));
                        if (closedRows.length === 0) {
                          return (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center text-slate-400">No trade history yet.</TableCell>
                            </TableRow>
                          );
                        }
                        return closedRows.map((row: any, idx: number) => {
                          const status = String(row.status || '').toUpperCase();
                          const rowColor = status === 'CLOSED_PROFIT' ? 'bg-emerald-900/50' : status === 'CLOSED_LOSS' ? 'bg-red-900/50' : '';
                          const id = row.id || `${row.lastSaleDate}-${row.asset}-${idx}`;
                          const isOpen = !!expanded[id];
                          const hasSales = Array.isArray(row.sales) && row.sales.length > 0;
                          return (
                            <React.Fragment key={id}>
                              <TableRow className={`border-slate-700 ${rowColor} ${hasSales ? 'cursor-pointer' : ''}`} onClick={() => hasSales && toggleExpand(id)}>
                                <TableCell className="text-slate-300">{row.lastSaleDate}</TableCell>
                                <TableCell className="text-slate-300 font-medium">{row.asset}</TableCell>
                                <TableCell className="text-slate-300">{formatCurrency(Number(safeNumber(row.amountUsd)).toFixed(2) as any)}</TableCell>
                                <TableCell className={`${row.totalRealizedUsd >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(Number(row.totalRealizedUsd.toFixed(2)))}</TableCell>
                                <TableCell className={`${row.totalRealizedPct >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{`${row.totalRealizedPct.toFixed(2)}%`}</TableCell>
                                <TableCell className="text-slate-300">{status.replace('_',' ')}</TableCell>
                              </TableRow>
                              {isOpen && hasSales && (
                                <TableRow className="border-slate-700">
                                  <TableCell colSpan={6}>
                                    <div className="bg-slate-900/50 rounded-md p-3">
                                      <div className="text-slate-400 text-sm mb-2">Sales</div>
                                      <Table>
                                        <TableHeader>
                                          <TableRow className="border-slate-800">
                                            <TableHead className="text-slate-500">Date</TableHead>
                                            <TableHead className="text-slate-500">Amount Sold ($)</TableHead>
                                            <TableHead className="text-slate-500">Realized PnL ($)</TableHead>
                                            <TableHead className="text-slate-500">Realized PnL (%)</TableHead>
                                          </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                          {row.sales.map((s: any, i: number) => (
                                            <TableRow key={`${id}-sale-${i}`} className="border-slate-800">
                                              <TableCell className="text-slate-300">{s.date}</TableCell>
                                              <TableCell className="text-slate-300">{formatCurrency(safeNumber(s.amountSoldUsd))}</TableCell>
                                              <TableCell className={`${safeNumber(s.realizedPnlUsd) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(safeNumber(s.realizedPnlUsd))}</TableCell>
                                              <TableCell className={`${safeNumber(s.realizedPnlPercent) >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{s.realizedPnlPercent == null ? '-' : formatPercentage(safeNumber(s.realizedPnlPercent))}</TableCell>
                                            </TableRow>
                                          ))}
                                        </TableBody>
                                      </Table>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                            </React.Fragment>
                          );
                        });
                      })()}
                    </TableBody>
                  </Table>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}