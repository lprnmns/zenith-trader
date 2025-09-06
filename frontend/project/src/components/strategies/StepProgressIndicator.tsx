import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Step {
  id: number;
  title: string;
  description?: string;
  completed: boolean;
  active: boolean;
}

interface StepProgressIndicatorProps {
  steps: Step[];
  className?: string;
}

const StepProgressIndicator: React.FC<StepProgressIndicatorProps> = ({ steps, className }) => {
  const completedSteps = steps.filter(step => step.completed).length;
  const progressPercentage = (completedSteps / steps.length) * 100;

  return (
    <div className={cn('step-progress-container', className)}>
      <div className="step-progress-line">
        <div 
          className="step-progress-line-active"
          style={{ width: `${progressPercentage}%` }}
        />
      </div>
      
      {steps.map((step, index) => (
        <div
          key={step.id}
          className={cn(
            'step-progress-item',
            step.active && 'active',
            step.completed && 'completed'
          )}
        >
          <div className="step-progress-circle">
            {step.completed ? (
              <Check className="w-4 h-4" />
            ) : (
              <span>{index + 1}</span>
            )}
          </div>
          <span className="step-progress-label">
            {step.title}
          </span>
        </div>
      ))}
    </div>
  );
};

export default StepProgressIndicator;
