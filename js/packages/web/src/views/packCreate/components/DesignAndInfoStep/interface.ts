import { FormInstance } from 'antd';
import { InfoFormState, PackState } from '../../interface';

export interface DesignAndInfoStepProps {
  setPackState: (values: Partial<PackState>) => void;
  form: FormInstance<InfoFormState>;
}
