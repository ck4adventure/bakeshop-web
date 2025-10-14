export const InventoryReasonLabels: Record<string, string> = {
  BATCH: 'Batch created',
  BAKE: 'Daily bake',
  ADJUSTMENT: 'Inventory adjustment',
  // Add more as needed
};

// Usage:
// const reason = 'BATCH';
// const label = InventoryReasonLabels[reason]; // 'Batch created'