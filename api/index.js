import entry from '../dist/index.cjs';

// In CJS-to-ESM interop, the app is often on the .default property
const app = entry.default || entry;

export default app;
