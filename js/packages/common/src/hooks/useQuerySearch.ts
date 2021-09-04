import { useLocation } from 'react-router-dom';

export function useQuerySearch() {
  return new URLSearchParams(useLocation().search);
}
