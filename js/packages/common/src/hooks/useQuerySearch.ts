
export function useQuerySearch() {
  return new URLSearchParams(window.location.search);
}
