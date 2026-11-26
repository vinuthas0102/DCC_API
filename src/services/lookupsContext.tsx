import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { DEFAULT_LOOKUPS, getLookups, type DccLookups } from '@/services/dccApiService';

interface LookupsState {
  lookups: DccLookups;
  loading: boolean;
  source: 'api' | 'file' | 'default';
}

const LookupsContext = createContext<LookupsState>({ lookups: DEFAULT_LOOKUPS, loading: true, source: 'default' });

export function LookupsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<LookupsState>({ lookups: DEFAULT_LOOKUPS, loading: true, source: 'default' });

  useEffect(() => {
    let cancelled = false;
    getLookups().then(({ lookups, source }) => {
      if (!cancelled) setState({ lookups, loading: false, source });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  return <LookupsContext.Provider value={state}>{children}</LookupsContext.Provider>;
}

export function useLookups(): LookupsState {
  return useContext(LookupsContext);
}
