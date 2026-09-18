import { useState, useEffect } from 'react';
import { Icon } from './Icon';

const TOUR_KEY = 'fm_tour_done';

const STEPS = [
  {
    title: 'Welcome to NodeVault',
    body: 'Your homelab file manager. Browse, upload, and manage files on your local network from any device.',
    icon: 'dns',
    anchor: null,
  },
  {
    title: 'Browse & Navigate',
    body: 'Click folders to navigate. Use the breadcrumb trail at the top to jump back. Drag files onto folders to move them.',
    icon: 'folder_open',
    anchor: null,
  },
  {
    title: 'Upload Files',
    body: 'Click Upload in the dock or drag files directly onto the grid. Files over 5 MB are automatically chunked for reliability.',
    icon: 'cloud_upload',
    anchor: null,
  },
  {
    title: 'Select & Act',
    body: 'Click to open, Ctrl+click to multi-select. Right-click for the context menu. Press F2 to rename, Delete to trash.',
    icon: 'checklist',
    anchor: null,
  },
  {
    title: 'Search & Command Palette',
    body: 'Press ⌘K to open the command palette. Press ? to see all keyboard shortcuts.',
    icon: 'search',
    anchor: null,
  },
  {
    title: 'Settings & Metrics',
    body: 'Visit Settings (gear icon) to change storage root, upload limits, and view live server metrics.',
    icon: 'settings',
    anchor: null,
  },
];

export function useOnboardingTour() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem(TOUR_KEY)) setShow(true);
  }, []);

  const dismiss = () => {
    localStorage.setItem(TOUR_KEY, '1');
    setShow(false);
  };

  return { show, dismiss };
}

interface OnboardingTourProps {
  onDismiss: () => void;
}

export function OnboardingTour({ onDismiss }: OnboardingTourProps) {
  const [step, setStep] = useState(0);
  const current = STEPS[step];
  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-(--color-inverse-surface)/40 backdrop-blur-sm"
        onClick={onDismiss}
      />

      {/* Card */}
      <div className="relative w-full max-w-sm bg-(--color-surface-container-lowest) rounded-2xl shadow-[0_24px_48px_-8px_rgba(23,25,28,0.18),0_8px_16px_-4px_rgba(23,25,28,0.08)] border border-(--color-surface-container-high) overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-(--color-surface-container-high)">
          <div
            className="h-full bg-(--color-primary) transition-all duration-300"
            style={{ width: `${((step + 1) / STEPS.length) * 100}%` }}
          />
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* Icon */}
          <div className="w-14 h-14 rounded-2xl bg-(--color-primary)/10 flex items-center justify-center">
            <Icon name={current.icon} size={32} className="text-(--color-primary)" />
          </div>

          {/* Text */}
          <div className="flex flex-col gap-2">
            <h2 className="font-family-geist text-[18px] font-semibold text-(--color-on-surface)">
              {current.title}
            </h2>
            <p className="font-(family-name:--font-family-inter) text-[13px] text-(--color-secondary) leading-relaxed">
              {current.body}
            </p>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {STEPS.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setStep(i)}
                className={`rounded-full transition-all ${
                  i === step
                    ? 'w-5 h-2 bg-(--color-primary)'
                    : 'w-2 h-2 bg-(--color-surface-container-highest) hover:bg-(--color-outline-variant)'
                }`}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 justify-between">
            <button
              type="button"
              onClick={onDismiss}
              className="font-family-geist text-[12px] text-(--color-secondary) hover:text-(--color-on-surface) transition-colors"
            >
              Skip tour
            </button>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="px-4 py-2 rounded-lg bg-(--color-surface-container-low) text-(--color-on-surface) font-family-geist text-[12px] hover:bg-(--color-surface-container) transition-colors"
                >
                  Back
                </button>
              )}
              <button
                type="button"
                onClick={() => isLast ? onDismiss() : setStep((s) => s + 1)}
                className="px-4 py-2 rounded-lg bg-(--color-primary) text-(--color-on-primary) font-family-geist text-[12px] font-medium hover:bg-(--color-primary-container) transition-colors"
              >
                {isLast ? 'Get started' : 'Next'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
