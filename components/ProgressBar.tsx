import React from 'react';

export interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
  labels?: string[];
  onStepClick?: (step: number) => void;
}

export function ProgressBar({
  currentStep,
  totalSteps,
  labels,
  onStepClick
}: ProgressBarProps) {
  const percentage = (currentStep / totalSteps) * 100;

  const getStepStatus = (step: number) => {
    if (step < currentStep) return 'completed';
    if (step === currentStep) return 'current';
    return 'pending';
  };

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        {Array.from({ length: totalSteps }).map((_, index) => {
          const step = index + 1;
          const status = getStepStatus(step);
          
          return (
            <React.Fragment key={step}>
              {index > 0 && (
                <div className="flex-1 mx-2">
                  <div 
                    className={`h-1 rounded transition-all duration-300 ${
                      status === 'completed' 
                        ? 'bg-pastoral-blue-600' 
                        : status === 'current'
                        ? 'bg-pastoral-blue-300'
                        : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  />
                </div>
              )}
              <button
                type="button"
                onClick={() => onStepClick && onStepClick(step)}
                disabled={step > currentStep}
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                  status === 'completed'
                    ? 'bg-pastoral-blue-600 text-white'
                    : status === 'current'
                    ? 'bg-pastoral-blue-600 text-white ring-4 ring-pastoral-blue-100 dark:ring-pastoral-blue-900'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-500'
                }`}
              >
                {status === 'completed' ? (
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  step
                )}
              </button>
            </React.Fragment>
          );
        })}
      </div>
      
      {labels && (
        <div className="flex justify-between mt-2">
          {labels.map((label, index) => (
            <div 
              key={index}
              className={`text-xs text-center flex-1 mx-1 ${
                getStepStatus(index + 1) === 'current'
                  ? 'text-pastoral-blue-600 font-medium'
                  : getStepStatus(index + 1) === 'completed'
                  ? 'text-gray-600 dark:text-gray-400'
                  : 'text-gray-400'
              }`}
            >
              {label}
            </div>
          ))}
        </div>
      )}

      <div className="mt-1 text-xs text-right text-gray-500">
        {currentStep} de {totalSteps} ({Math.round(percentage)}%)
      </div>
    </div>
  );
}

export function StepIndicator({ 
  currentStep, 
  totalSteps 
}: { 
  currentStep: number; 
  totalSteps: number;
}) {
  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div
          key={index}
          className={`h-2 w-8 rounded-full transition-all duration-300 ${
            index < currentStep
              ? 'bg-pastoral-blue-600'
              : index === currentStep
              ? 'bg-pastoral-blue-300'
              : 'bg-gray-200 dark:bg-gray-700'
          }`}
        />
      ))}
    </div>
  );
}