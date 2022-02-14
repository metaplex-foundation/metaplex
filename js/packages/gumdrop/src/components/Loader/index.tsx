import React from 'react';

export type LoadingContextState = {
  loading: number,
  setLoading: React.Dispatch<React.SetStateAction<number>>,
}

export const LoadingContext = React.createContext<LoadingContextState | null>(null);

export const LoaderProvider: React.FC = ({ children }) => {
  const [loading, setLoading] = React.useState(0);
  return (
    <LoadingContext.Provider
      value={{
        loading,
        setLoading,
      }}
    >
      <div className={`loader-container ${loading ? 'active' : ''}`}>
        <div className="loader-block">
          <div className="loader-title">loading</div>
          <Spinner />
        </div>
      </div>
      {children}
    </LoadingContext.Provider>
  );
};

export const incLoading = (p: number) => p + 1;
export const decLoading = (p: number) => p - 1;

export const useLoading = () => {
  const context = React.useContext(LoadingContext);
  if (context === null) {
    throw new Error(`useLoading must be used with a LoadingProvider`);
  }
  return context;
};

export const Spinner = () => {
  return (
    <div className="spinner">
      <span className="line line-1" />
      <span className="line line-2" />
      <span className="line line-3" />
      <span className="line line-4" />
      <span className="line line-5" />
      <span className="line line-6" />
      <span className="line line-7" />
      <span className="line line-8" />
      <span className="line line-9" />
    </div>
  );
};
