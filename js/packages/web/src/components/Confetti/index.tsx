import React, {
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
} from 'react';
import confetti from 'canvas-confetti';

export interface ConfettiContextState {
  dropConfetti: () => void;
}

const ConfettiContext = React.createContext<ConfettiContextState>({
  dropConfetti: () => {},
});

export const ConfettiProvider = ({
  children = null,
}: {
  children: ReactNode;
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const confettiRef = useRef<confetti.CreateTypes>();

  const dropConfetti = useMemo(
    () => () => {
      if (confettiRef.current && canvasRef.current) {
        canvasRef.current.style.visibility = 'visible';
        confettiRef
          .current({
            particleCount: 400,
            spread: 160,
            origin: { y: 0.3 },
          })
          ?.finally(() => {
            if (canvasRef.current) {
              canvasRef.current.style.visibility = 'hidden';
            }
          });
      }
    },
    [],
  );

  useEffect(() => {
    if (canvasRef.current && !confettiRef.current) {
      canvasRef.current.style.visibility = 'hidden';
      confettiRef.current = confetti.create(canvasRef.current, {
        resize: true,
        useWorker: true,
      });
    }
  }, []);

  return (
    <ConfettiContext.Provider value={{ dropConfetti }}>
      <canvas ref={canvasRef} id="metaplex-confetti" />
      {children}
    </ConfettiContext.Provider>
  );
};

export const Confetti = () => {
  const { dropConfetti } = useConfetti();

  useEffect(() => {
    dropConfetti();
  }, [dropConfetti]);

  return <></>;
};

export const useConfetti = () => {
  const context = useContext(ConfettiContext);
  return context;
};
