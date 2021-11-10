import { useCallback, useEffect, useState } from 'react';
import { useHistory, useParams } from 'react-router-dom';

import { CreatePackSteps } from '../types';

const useStep = (): {
  step: CreatePackSteps;
  goToNextStep: (nextStep?: CreatePackSteps) => void;
  resetStep: () => void;
} => {
  const [step, setStep] = useState<CreatePackSteps>(
    CreatePackSteps.SelectItems,
  );
  const history = useHistory();
  const { stepParam }: { stepParam: string } = useParams();

  const goToNextStep = useCallback(
    (nextStep?: CreatePackSteps) => {
      const historyNextStep = nextStep === undefined ? step + 1 : nextStep;
      history.push(`/admin/pack/create/${historyNextStep.toString()}`);
    },
    [step, history],
  );

  const resetStep = useCallback(() => {
    setStep(CreatePackSteps.SelectItems);
  }, [setStep]);

  useEffect(() => {
    if (stepParam) {
      return setStep(parseInt(stepParam));
    }

    goToNextStep(CreatePackSteps.SelectItems);
  }, [stepParam]);

  return { step, goToNextStep, resetStep };
};

export default useStep;
