import React, { useEffect, useState, useCallback, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useStrategiesStore } from '@/stores/strategiesStore';
import { useNavigate } from 'react-router-dom';
import { formatCurrency, formatPercentage } from '@/lib/utils';
import { 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  DollarSign,
  ArrowRight,
  CheckCircle,
  XCircle
} from 'lucide-react';
import { getDashboardSummary } from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';

// Memoized components for better performance
const SummaryCard = memo(({ title, value, subtitle, icon: Icon, color, trend }: {
  title: string;
  value: string;
  subtitle: string;
  icon: React.ComponentType<any>;
  color: string;
  trend?: React.ReactNode;
}) => (
  <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
      <Icon className={`h-4 w-4 ${color}`} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl lg:text-3xl font-bold text-white mb-1">
        {value}
      </div>
      <p className="text-xs text-slate-400">
        {subtitle}
      </p>
      {trend}
    </CardContent>
  </Card>
));

SummaryCard.displayName = 'SummaryCard';

const StrategyItem = memo(({ strategy, onClick }: {
  strategy: any;
  onClick: (id: string) => void;
}) => (
  <div
    onClick={() => onClick(strategy.id)}
    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-slate-700/30 rounded-lg border border-slate-700/50 cursor-pointer hover:bg-slate-700/50 transition-colors"
  >
    <div className="mb-3 sm:mb-0">
      <h3 className="font-medium text-white">{strategy.name}</h3>
      <p className="text-sm text-slate-400">
        {strategy.exchange} • {strategy.copyMode}
      </p>
    </div>
    <div className="flex items-center justify-between sm:justify-end gap-4">
      <div className={`font-medium ${strategy.currentPnL >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
        {formatCurrency(strategy.currentPnL)}
      </div>
      <Badge variant={strategy.isActive ? 'default' : 'secondary'} className="text-xs">
        {strategy.isActive ? 'Active' : 'Inactive'}
      </Badge>
    </div>
  </div>
));

StrategyItem.displayName = 'StrategyItem';

const TradeItemMobile = memo(({ trade }: { trade: any }) => (
  <div key={trade.id} className="p-4 bg-slate-700/30 rounded-lg border border-slate-700/50">
    <div className="flex items-center justify-between mb-2">
      <Badge 
        variant={trade.action === 'BUY' ? 'default' : 'secondary'}
        className={trade.action === 'BUY' ? 'bg-emerald-500' : 'bg-red-500'}
      >
        {trade.action}
      </Badge>
      <div className="text-xs text-slate-400">
        {new Date(trade.timestamp).toLocaleTimeString()}
      </div>
    </div>
    <div className="flex items-center justify-between">
      <div>
        <div className="font-medium text-white">{trade.token}</div>
        <div className="text-sm text-slate-400">{trade.strategyName}</div>
      </div>
      <div className="text-right">
        <div className="font-medium text-white">{formatCurrency(trade.amount)}</div>
        {trade.status === 'Success' ? (
          <CheckCircle className="w-4 h-4 text-emerald-400 ml-auto" />
        ) : (
          <XCircle className="w-4 h-4 text-red-400 ml-auto" />
        )}
      </div>
    </div>
  </div>
));

TradeItemMobile.displayName = 'TradeItemMobile';

export function DashboardPage() {
  const { strategies } = useStrategiesStore();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<any>({
    totalPnl24h: 0,
    totalPnl24hPercentage: 0,
    activeStrategiesCount: 0,
    totalStrategiesCount: 0,
    totalTrades24h: 0,
    recentTrades: [],
  });

  const loadDashboardData = useCallback(async () => {
    try {
      const res = await getDashboardSummary();
      setSummary(res.data);
      setError(null);
    } catch (e) {
      setError('Failed to load dashboard summary');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    loadDashboardData();
    return () => { mounted = false; };
  }, [loadDashboardData]);

  const handleStrategyClick = useCallback((strategyId: string) => {
    navigate(`/strategies?open=${strategyId}`);
  }, [navigate]);

  const activeStrategies = React.useMemo(() => 
    strategies.filter(s => s.isActive), 
    [strategies]
  );

  const handleRetry = useCallback(() => {
    setLoading(true);
    setError(null);
    loadDashboardData();
  }, [loadDashboardData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-10 w-40 mb-2" />
          <Skeleton className="h-6 w-64" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-80 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <div className="text-6xl">🚨</div>
        <h2 className="text-xl font-semibold text-white">Oops! Something went wrong</h2>
        <p className="text-slate-400 text-center max-w-md">
          We couldn't load your dashboard data. This might be due to a connection issue or server maintenance.
        </p>
        <Button 
          onClick={handleRetry} 
          className="bg-emerald-500 hover:bg-emerald-600"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Dashboard</h1>
        <p className="text-slate-400">Overview of your trading performance</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 lg:gap-6">
        <SummaryCard
          title="Total PnL (24h)"
          value={formatCurrency(summary.totalPnl24h)}
          subtitle={formatPercentage(summary.totalPnl24hPercentage)}
          icon={summary.totalPnl24h >= 0 ? TrendingUp : TrendingDown}
          color={summary.totalPnl24h >= 0 ? 'text-emerald-400' : 'text-red-400'}
        />
        
        <SummaryCard
          title="Active Strategies"
          value={summary.activeStrategiesCount.toString()}
          subtitle={`of ${summary.totalStrategiesCount} total strategies`}
          icon={Activity}
          color="text-blue-400"
        />
        
        <SummaryCard
          title="Total Trades (24h)"
          value={summary.totalTrades24h.toString()}
          subtitle="across all strategies"
          icon={DollarSign}
          color="text-yellow-400"
        />
      </div>

      {/* Active Strategies Summary */}
      <Card className="bg-slate-800/50 backdrop-blur-sm border-slate-700/50">
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-white">Active Strategies</CardTitle>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/strategies')}
              className="border-slate-600 text-slate-300 hover:text-white hover:bg-slate-700 w-full sm:w-auto"
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
                className="bg-emerald-500 hover:bg-emerald-600 w-full sm:w-auto"
              >
                Create Your First Strategy
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {activeStrategies.slice(0, 3).map((strategy) => (
                <StrategyItem 
                  key={strategy.id}
                  strategy={strategy}
                  onClick={handleStrategyClick}
                />
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
          {/* Mobile View */}
          <div className="sm:hidden space-y-3">
            {(!summary.recentTrades || summary.recentTrades.length === 0) ? (
              <div className="text-center py-8 text-slate-400">No recent trades.</div>
            ) : summary.recentTrades.map((trade: any) => (
              <TradeItemMobile key={trade.id} trade={trade} />
            ))}
          </div>

          {/* Desktop View */}
          <div className="hidden sm:block">
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
                {(!summary.recentTrades || summary.recentTrades.length === 0) ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-slate-400">No recent trades.</TableCell>
                  </TableRow>
                ) : summary.recentTrades.map((trade: any) => (
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}