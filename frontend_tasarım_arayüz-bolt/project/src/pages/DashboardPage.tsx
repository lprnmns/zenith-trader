import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStrategiesStore } from '@/stores/strategiesStore';
import { useNavigate } from 'react-router-dom';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  ArrowRight,
  CheckCircle,
  XCircle
} from 'lucide-react';

export function DashboardPage() {
  const { strategies, recentTrades } = useStrategiesStore();
  const navigate = useNavigate();

  const activeStrategies = strategies.filter(s => s.isActive);
  const total24hPnL = activeStrategies.reduce((sum, strategy) => sum + strategy.currentPnL, 0);
  const total24hTrades = recentTrades.filter(trade => {
    const tradeDate = new Date(trade.timestamp);
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    return tradeDate >= yesterday;
  }).length;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercentage = (amount: number, total: number) => {
    if (total === 0) return '0.00%';
    return `${((amount / total) * 100).toFixed(2)}%`;
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Overview of your trading performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total PnL (24h)</CardTitle>
            {total24hPnL >= 0 ? (
              <TrendingUp className="h-4 w-4 text-emerald-400" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-400" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">
              {formatCurrency(total24hPnL)}
            </div>
            <p className={`text-xs ${total24hPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              {total24hPnL >= 0 ? '+' : ''}{formatPercentage(total24hPnL, 10000)}
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Active Strategies</CardTitle>
            <Activity className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">
              {activeStrategies.length}
            </div>
            <p className="text-xs text-slate-400">
              of {strategies.length} total strategies
            </p>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-400">Total Trades (24h)</CardTitle>
            <DollarSign className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white mb-1">
              {total24hTrades}
            </div>
            <p className="text-xs text-slate-400">
              across all strategies
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Active Strategies Summary */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-white">Active Strategies</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/strategies')}
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700"
            >
              View All <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {activeStrategies.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-slate-400 mb-4">No active strategies yet</p>
              <Button 
                onClick={() => navigate('/strategies')}
                className="bg-emerald-500 hover:bg-emerald-600"
              >
                Create Your First Strategy
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeStrategies.slice(0, 3).map((strategy) => (
                <div
                  key={strategy.id}
                  className="flex items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-700/50"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <h3 className="font-medium text-white">{strategy.name}</h3>
                      <p className="text-sm text-slate-400">
                        {strategy.exchange} • {strategy.copyMode}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-medium ${strategy.currentPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                      {formatCurrency(strategy.currentPnL)}
                    </div>
                    <Badge variant={strategy.isActive ? "default" : "secondary"} className="text-xs">
                      {strategy.isActive ? "Active" : "Inactive"}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Trades */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
        <CardHeader>
          <CardTitle className="text-white">Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow className="border-slate-700">
                <TableHead className="text-slate-400">Time</TableHead>
                <TableHead className="text-slate-400">Strategy</TableHead>
                <TableHead className="text-slate-400">Action</TableHead>
                <TableHead className="text-slate-400">Token</TableHead>
                <TableHead className="text-slate-400">Amount</TableHead>
                <TableHead className="text-slate-400">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentTrades.slice(0, 5).map((trade) => (
                <TableRow key={trade.id} className="border-slate-700">
                  <TableCell className="text-slate-300">
                    {new Date(trade.timestamp).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="text-slate-300">{trade.strategyName}</TableCell>
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
                  <TableCell>
                    {trade.status === 'Success' ? (
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}