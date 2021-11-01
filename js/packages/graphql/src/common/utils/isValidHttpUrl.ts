export function isValidHttpUrl(text: string) {
  if (text.startsWith("http:") || text.startsWith("https:")) {
    return true;
  }

  return false;
}
