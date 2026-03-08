import entry from '../dist/index.cjs';

// The compiled server exports an async handler that awaits full initialization
// before processing any request (fixes cold-start race conditions on Vercel)
const handler = entry.default || entry;

export default handler;
