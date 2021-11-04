import { PackState } from '../../interface';

export interface SalesSettingsStepProps {
  setPackState: (values: Partial<PackState>) => void;
  redeemEndDate?: moment.Moment | null;
}
