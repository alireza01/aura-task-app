export function generateFractionalIndex(prev?: string | null, next?: string | null): string {
  const defaultPrev = 0.0;
  const defaultNextOffset = 1.0;

  if (prev == null && next == null) {
    // First item in an empty list
    return "1.0";
  }

  const prevNum = prev ? parseFloat(prev) : null;
  const nextNum = next ? parseFloat(next) : null;

  if (prevNum !== null && nextNum !== null) {
    if (prevNum >= nextNum) {
      // This case should ideally not happen if data is consistent,
      // but as a fallback, place it after prev.
      console.warn(`prevIndex ${prev} is not less than nextIndex ${next}. Placing item after prev.`);
      return (prevNum + defaultNextOffset).toString();
    }
    return ((prevNum + nextNum) / 2).toString();
  } else if (prevNum !== null) {
    // No next item, place it at the end
    return (prevNum + defaultNextOffset).toString();
  } else if (nextNum !== null) {
    // No prev item, place it at the beginning
    // Ensure it's smaller than the current first item.
    // If nextNum is very small (e.g., 0.001), dividing by 2 is safer than subtracting 1.
    const newIndex = nextNum / 2;
    // Avoid generating "0" or negative if nextNum was positive, ensure some spacing.
    // Also handle case where nextNum might be 1.0, leading to 0.5
    if (newIndex > 0) {
        return newIndex.toString();
    } else {
        // if nextNum is 0 or less, or newIndex became 0 (e.g. nextNum was 0.000001)
        // place it significantly before nextNum
        return (nextNum - defaultNextOffset).toString();
    }
  }

  // Should be unreachable given the first condition, but as a fallback:
  return (defaultPrev + defaultNextOffset).toString();
}
