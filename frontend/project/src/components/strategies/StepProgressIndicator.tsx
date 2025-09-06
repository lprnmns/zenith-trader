import React from 'react';
import { CheckCircle, Circle, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Step {
  id: number;
  title: string;
  description: string;
  completed: boolean;
  active: boolean;
}

export interface StepProgressIndicatorProps {
  steps: Step[];
  className?: string;
}

const StepProgressIndicator: React.FC<StepProgressIndicatorProps> = ({ 
  steps, 
  className 
}) => {
  return (
    <div className={cn('step-progress', className)}>
      <div className="flex items-center justify-between relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-0 right-0 h-0.5 bg-slate-700">
          <div 
            className="h-full bg-emerald-500 transition-all duration-500"
            style={{
              width: `${(steps.filter(step => step.completed).length / (steps.length - 1)) * 100}%`
            }}
          />
        </div>

        {/* Steps */}
        {steps.map((step, index) => (
          <div 
            key={step.id}
            className={cn(
              'step-item relative flex flex-col items-center z-10 cursor-pointer transition-all duration-200',
              {
                'opacity-100': step.active || step.completed,
                'opacity-60': !step.active && !step.completed,
              }
            )}
          >
            {/* Step Circle */}
            <div 
              className={cn(
                'step-circle w-10 h-10 rounded-full flex items-center justify-center transition-all duration-300 border-2',
                {
                  'bg-emerald-500 border-emerald-500 text-white': step.completed,
                  'bg-slate-800 border-emerald-500 text-emerald-400': step.active,
                  'bg-slate-700 border-slate-600 text-slate-400': !step.active && !step.completed,
                }
              )}
            >
              {step.completed ? (
                <CheckCircle className="w-5 h-5" />
              ) : (
                <Circle className="w-5 h-5" />
              )}
            </div>

            {/* Step Content */}
            <div className="mt-3 text-center max-w-[120px]">
              <div 
                className={cn(
                  'step-title font-medium text-sm transition-colors',
                  {
                    'text-emerald-400': step.active,
                    'text-green-400': step.completed,
                    'text-slate-400': !step.active && !step.completed,
                  }
                )}
              >
                {step.title}
              </div>
              <div 
                className={cn(
                  'step-description text-xs mt-1 transition-colors',
                  {
                    'text-slate-300': step.active,
                    'text-slate-400': step.completed,
                    'text-slate-500': !step.active && !step.completed,
                  }
                )}
              >
                {step.description}
              </div>
            </div>

            {/* Arrow (except for last step) */}
            {index < steps.length - 1 && (
              <div className="absolute -right-6 top-5 text-slate-400">
                <ArrowRight className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Mobile Steps */}
      <div className="md:hidden mt-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-emerald-400">
            Adım {steps.findIndex(step => step.active) + 1} / {steps.length}
          </span>
          <span className="text-sm text-slate-400">
            {steps.find(step => step.active)?.title}
          </span>
        </div>
        <div className="w-full bg-slate-700 rounded-full h-2">
          <div 
            className="bg-emerald-500 h-2 rounded-full transition-all duration-500"
            style={{
              width: `${(steps.filter(step => step.completed).length / (steps.length - 1)) * 100}%`
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default StepProgressIndicator;