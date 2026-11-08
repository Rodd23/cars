import "@testing-library/jest-dom/vitest";

// jsdom não implementa rolagem; ScrollRestoration e foco chamam estas APIs.
window.scrollTo = (() => {}) as typeof window.scrollTo;

// jsdom não implementa estas APIs usadas pelo Radix (Popover, DropdownMenu, ToggleGroup).
class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
Element.prototype.hasPointerCapture ??= () => false;
Element.prototype.setPointerCapture ??= () => {};
Element.prototype.releasePointerCapture ??= () => {};
Element.prototype.scrollIntoView ??= () => {};
