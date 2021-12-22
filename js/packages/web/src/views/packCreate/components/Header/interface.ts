import { CreatePackSteps } from '../../types';

export interface HeaderProps {
  step: CreatePackSteps;
}

export interface HeaderContentRecord {
  title: string;
  subtitle?: string;
}
