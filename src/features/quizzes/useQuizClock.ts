import { useEffect, useRef, useState } from 'react';

// Advance from the last server timestamp without relying on changes to the
// device's wall clock. Availability checks still run on the server.
export default function useQuizClock(serverTime?: string) {
  const anchor = useRef({ server: Date.now(), client: performance.now() });
  const [now, setNow] = useState(anchor.current.server);
  useEffect(() => {
    const server = serverTime ? Date.parse(serverTime) : NaN;
    if (Number.isFinite(server)) {
      anchor.current = { server, client: performance.now() };
      setNow(server);
    }
  }, [serverTime]);
  useEffect(() => {
    const timer = setInterval(() => setNow(anchor.current.server + performance.now() - anchor.current.client), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}
