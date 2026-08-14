/**
 * Test environment shims for jsdom.
 */

// Tells React this environment supports act(), so state updates flush
// synchronously in tests instead of warning.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

/**
 * jsdom does not implement ResizeObserver, which the symbiosis overlay uses to
 * keep its lines pinned to the cards. Real browsers provide the genuine article.
 */
class ResizeObserverStub {
  observe(): void {}
  unobserve(): void {}
  disconnect(): void {}
}

if (!('ResizeObserver' in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver = ResizeObserverStub;
}
