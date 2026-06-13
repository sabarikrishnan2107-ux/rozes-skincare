// Sales channels (stored in sales_entries.source).
// Used by the Sales entry forms and the Dashboard channel breakdown.

export const SALES_CHANNELS = [
  { value: 'website', label: 'My Website' },
  { value: 'noon',    label: 'Noon' },
  { value: 'amazon',  label: 'Amazon' },
  { value: 'manual',  label: 'Walk-in' }
];

// Labels for every source we might encounter, including legacy/auto ones.
const CHANNEL_LABELS = {
  website: 'My Website',
  noon: 'Noon',
  amazon: 'Amazon',
  manual: 'Walk-in',
  scan: 'OCR Scan'
};

export function channelLabel(source) {
  if (CHANNEL_LABELS[source]) return CHANNEL_LABELS[source];
  if (!source) return 'Other';
  return source.charAt(0).toUpperCase() + source.slice(1);
}
