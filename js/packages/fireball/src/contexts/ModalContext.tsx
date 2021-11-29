import React, { useState, useContext, useCallback } from 'react';

import { WalletModal } from './WalletContext/WalletContext';

export enum ModalEnum {
  WALLET = 'wallet',
}

type ModalContextProps = {
  setModal: (modal: ModalEnum | undefined) => void;
  removeModal: () => void;
};

export const ModalContext = React.createContext<ModalContextProps>({
  setModal: () => null,
  removeModal: () => null,
});

export const ModalProvider: React.FC = ({ children }) => {
  const [modal, setModal] = useState<ModalEnum | undefined>(undefined);

  const removeModal = useCallback(() => {
    setModal(undefined);
  }, [setModal]);

  return (
    <ModalContext.Provider
      value={{
        setModal,
        removeModal,
      }}
    >
      {children}
      {modal === ModalEnum.WALLET && <WalletModal />}
    </ModalContext.Provider>
  );
};

export const useModal = (): ModalContextProps => {
  const context = useContext(ModalContext);
  if (context === undefined) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};
