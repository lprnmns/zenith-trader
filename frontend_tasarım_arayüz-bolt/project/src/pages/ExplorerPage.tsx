import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Search, ExternalLink, TrendingUp, TrendingDown } from 'lucide-react';
import { getWalletPerformance } from '@/lib/api';

const mockTradeHistory = [
  { id: '1', date: '2024-01-25 14:30', action: 'SELL', asset: 'ETH', amount: 2850, pnl: 425.60, pnlPercentage: 17.5 },
  { id: '2', date: '2024-01-24 09:15', action: 'BUY', asset: 'ARB', amount: 1200, pnl: null, pnlPercentage: null },
  { id: '3', date: '2024-01-23 16:45', action: 'SELL', asset: 'MATIC', amount: 750, pnl: -89.20, pnlPercentage: -10.6 },
  { id: '4', date: '2024-01-22 11:20', action: 'BUY', asset: 'BTC', amount: 5000, pnl: null, pnlPercentage: null },
  { id: '5', date: '2024-01-21 13:55', action: 'SELL', asset: 'SOL', amount: 980, pnl: 156.80, pnlPercentage: 19.1 },
];

export function ExplorerPage() {
  const [walletAddress, setWalletAddress] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [selectedTimeframe, setSelectedTimeframe] = useState('1M');
  const [performance, setPerformance] = useState<any | null>(null);

  const handleAnalyze = async () => {
    if (!walletAddress.trim()) return;
    setIsAnalyzing(true);
    try {
      const res = await getWalletPerformance(walletAddress.trim());
      setPerformance(res.data);
      setHasAnalyzed(true);
    } catch (e) {
      setPerformance(null);
      setHasAnalyzed(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
  const formatPercentage = (percentage: number) => `${percentage > 0 ? '+' : ''}${percentage.toFixed(2)}%`;

  const totalPnL = mockTradeHistory.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const successfulTrades = mockTradeHistory.filter(trade => trade.pnl && trade.pnl > 0).length;
  const winRate = (successfulTrades / mockTradeHistory.filter(trade => trade.pnl !== null).length) * 100;

  const perfSeries = performance ? [
    { date: '1D', value: performance['1G']?.pnlUSD ?? 0 },
    { date: '7D', value: performance['1H']?.pnlUSD ?? 0 },
    { date: '30D', value: performance['1A']?.pnlUSD ?? 0 },
    { date: '1Y', value: performance['1Y']?.pnlUSD ?? 0 },
  ] : [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Wallet Explorer</h1>
        <p className="text-slate-400">Analyze any wallet's trading performance and copy their strategies</p>
      </div>

      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
        <CardContent className="p-6">
          <div className="flex gap-4">
            <Input placeholder="Enter wallet address (0x...)" value={walletAddress} onChange={(e) => setWalletAddress(e.target.value)} className="flex-1 h-12 bg-slate-700/50 border-slate-600 focus:border-emerald-400 text-white placeholder:text-slate-400" />
            <Button onClick={handleAnalyze} disabled={!walletAddress.trim() || isAnalyzing} className="h-12 px-8 bg-emerald-500 hover:bg-emerald-600">
              {isAnalyzing ? 'Analyzing...' : (<><Search className="w-5 h-5 mr-2" />Analyze</>)}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasAnalyzed && performance && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">1D PnL</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-bold ${performance['1G']?.pnlUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(performance['1G']?.pnlUSD || 0)}</div></CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">7D PnL</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-bold ${performance['1H']?.pnlUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(performance['1H']?.pnlUSD || 0)}</div></CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">30D PnL</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-bold ${performance['1A']?.pnlUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(performance['1A']?.pnlUSD || 0)}</div></CardContent>
            </Card>
            <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
              <CardHeader className="pb-3"><CardTitle className="text-sm font-medium text-slate-400">1Y PnL</CardTitle></CardHeader>
              <CardContent><div className={`text-2xl font-bold ${performance['1Y']?.pnlUSD >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>{formatCurrency(performance['1Y']?.pnlUSD || 0)}</div></CardContent>
            </Card>
          </div>

          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
            <CardHeader>
              <div className="flex items-center justify-between"><CardTitle className="text-white">Portfolio Performance</CardTitle>
                <Tabs value={selectedTimeframe} onValueChange={setSelectedTimeframe}><TabsList className="bg-slate-700/50"><TabsTrigger value="1D" className="data-[state=active]:bg-emerald-600">1D</TabsTrigger><TabsTrigger value="7D" className="data-[state=active]:bg-emerald-600">7D</TabsTrigger><TabsTrigger value="1M" className="data-[state=active]:bg-emerald-600">1M</TabsTrigger><TabsTrigger value="1Y" className="data-[state=active]:bg-emerald-600">1Y</TabsTrigger></TabsList></Tabs>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%"><LineChart data={perfSeries}><CartesianGrid strokeDasharray="3 3" stroke="#374151" /><XAxis dataKey="date" stroke="#9CA3AF" tick={{ fontSize: 12 }} /><YAxis stroke="#9CA3AF" tick={{ fontSize: 12 }} tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`} /><Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F3F4F6' }} formatter={(value) => [formatCurrency(value as number), 'PnL']} /><Line type="monotone" dataKey="value" stroke="#10B981" strokeWidth={2} dot={false} /></LineChart></ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Trade History stays mocked for now */}
          <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50"><CardHeader><CardTitle className="text-white">Trade History</CardTitle><p className="text-sm text-slate-400">Recent trading activity</p></CardHeader><CardContent><Table><TableHeader><TableRow className="border-slate-700"><TableHead className="text-slate-400">Date</TableHead><TableHead className="text-slate-400">Action</TableHead><TableHead className="text-slate-400">Asset</TableHead><TableHead className="text-slate-400">Amount</TableHead><TableHead className="text-slate-400">PnL ($)</TableHead><TableHead className="text-slate-400">PnL (%)</TableHead><TableHead className="text-slate-400"></TableHead></TableRow></TableHeader><TableBody>{mockTradeHistory.map((trade) => (<TableRow key={trade.id} className="border-slate-700"><TableCell className="text-slate-300">{trade.date}</TableCell><TableCell><Badge variant={trade.action === 'BUY' ? 'default' : 'secondary'} className={trade.action === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}>{trade.action}</Badge></TableCell><TableCell className="text-slate-300 font-medium">{trade.asset}</TableCell><TableCell className="text-slate-300">{formatCurrency(trade.amount)}</TableCell><TableCell className={trade.pnl === null ? 'text-slate-400' : trade.pnl >= 0 ? 'text-emerald-400' : 'text-red-400'}>{trade.pnl === null ? '-' : formatCurrency(trade.pnl)}</TableCell><TableCell className={trade.pnlPercentage === null ? 'text-slate-400' : trade.pnlPercentage >= 0 ? 'text-emerald-400' : 'text-red-400'}>{trade.pnlPercentage === null ? '-' : formatPercentage(trade.pnlPercentage)}</TableCell><TableCell><Button size="sm" variant="ghost" className="text-slate-400 hover:text-white"><ExternalLink className="w-4 h-4" /></Button></TableCell></TableRow>))}</TableBody></Table></CardContent></Card>
        </>
      )}
    </div>
  );
}