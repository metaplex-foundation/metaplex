import { CreatePackSteps } from '../../types';

export interface SidebarProps {
  step: CreatePackSteps;
  isValidStep: boolean;
  setStep: (step: CreatePackSteps) => void;
  submit: () => void;
  buttonLoading?: boolean;
}
