import React, { createContext, useContext, ReactNode } from 'react';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
// Ensure IDisplayData is imported from the correct path if it changes
import { IDisplayData, getDisplays } from '../actions/display';

interface IGlobalDisplayListContextType {
  displays: IDisplayData[] | undefined;
  isLoading: boolean;
  error: Error | null;
  refetchDisplays: () => void;
}

const GlobalDisplayListContext = createContext<IGlobalDisplayListContextType | undefined>(undefined);

export const GlobalDisplayListProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: displays, isLoading, error, refetch }: UseQueryResult<IDisplayData[], Error> = useQuery<IDisplayData[], Error>({
    queryKey: ['displays'],
    queryFn: () => getDisplays(""), // Calling with empty string for host, as it's expected by the actual getDisplays
  });

  const refetchDisplays = () => {
    queryClient.invalidateQueries({ queryKey: ['displays'] });
  };

  return (
    <GlobalDisplayListContext.Provider value={{ displays, isLoading, error, refetchDisplays }}>
      {children}
    </GlobalDisplayListContext.Provider>
  );
};

export const useGlobalDisplayList = (): IGlobalDisplayListContextType => {
  const context = useContext(GlobalDisplayListContext);
  if (context === undefined) {
    throw new Error('useGlobalDisplayList must be used within a GlobalDisplayListProvider');
  }
  return context;
};
