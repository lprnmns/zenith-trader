// src/pages/StrategiesPage.tsx
import { useEffect } from 'react';
import { useStrategyStore } from '@/stores/strategyStore';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';

export default function StrategiesPage() {
  const { strategies, fetchStrategies, isLoading } = useStrategyStore();

  useEffect(() => {
    fetchStrategies();
  }, [fetchStrategies]);

  if (isLoading) {
    return <div>Loading Strategies...</div>;
  }

  return (
        <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">My Strategies</h1>
        {/* TODO: Dialog with StrategyForm */}
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" /> Create New Strategy
        </Button>
      </div>

      {strategies.length === 0 ? (
        <div className="flex flex-col items-center justify-center text-center border-2 border-dashed border-gray-700 rounded-lg p-12 h-64">
          <h2 className="text-xl font-semibold">No Strategies Found</h2>
          <p className="text-muted-foreground mt-2">
            Click the button above to create your first copy trading strategy.
          </p>
            </div>
      ) : (
        <div className="space-y-4">
          {strategies.map((strategy) => (
            <div key={strategy.id} className="p-4 border rounded-md">{strategy.name}</div>
          ))}
        </div>
      )}
    </div>
  );
}