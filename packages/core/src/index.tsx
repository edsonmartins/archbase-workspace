// Async boundary — required for Module Federation shared module initialization.
// MF needs a dynamic import here so it can resolve shared singletons (React,
// Zustand, SDK) before any synchronous code runs.
import('./bootstrap');
