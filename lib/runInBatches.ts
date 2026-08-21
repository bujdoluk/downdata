// Shared by the poller and the notifier so both get the same "don't do
// 1000s of things one at a time" treatment consistently.
export async function runInBatches<T>(items: T[], batchSize: number, fn: (item: T) => Promise<void>): Promise<void> {
  for (let i = 0; i < items.length; i += batchSize) {
    await Promise.allSettled(items.slice(i, i + batchSize).map(fn));
  }
}
