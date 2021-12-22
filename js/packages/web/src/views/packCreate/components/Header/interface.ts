import { CreatePackSteps } from '../../types';
import { ReactElement } from 'react';

export interface HeaderProps {
  step: CreatePackSteps;
  extraContent?: ReactElement | false;
}

export interface HeaderContentRecord {
  title: string;
  subtitle?: string;
}
