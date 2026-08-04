export const slugifyToCamelCase = (label = '') => {
  const cleaned = String(label)
    .trim()
    .replace(/[^a-zA-Z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .toLowerCase();
  if (!cleaned) return '';
  const words = cleaned.split(' ');
  return words
    .map((word, idx) => (idx === 0 ? word : `${word.charAt(0).toUpperCase()}${word.slice(1)}`))
    .join('');
};
