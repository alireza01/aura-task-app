"use client"

import { useState, useEffect } from "react"

/**
 * A custom React hook that debounces a value.
 * This hook delays updating a value until a specified time has passed since the last change.
 * Useful for delaying expensive operations like API calls or heavy computations
 * until the user has stopped typing or interacting.
 *
 * @template T The type of the value being debounced.
 * @param {T} value The value to debounce.
 * @param {number} delay The delay in milliseconds before the debounced value is updated.
 * @returns {T} The debounced value.
 */
export function useDebounce<T>(value: T, delay: number): T {
  // State to store the debounced value
  const [debouncedValue, setDebouncedValue] = useState<T>(value)

  useEffect(() => {
    // Set a timer to update the debounced value after the specified delay
    const timer = setTimeout(() => {
      setDebouncedValue(value)
    }, delay)

    // Cleanup function: clear the timer if the value or delay changes,
    // or if the component unmounts. This prevents memory leaks and
    // ensures the previous timer is cancelled if a new value comes in quickly.
    return () => {
      clearTimeout(timer)
    }
  }, [value, delay]) // Re-run effect only if 'value' or 'delay' changes

  return debouncedValue
}
