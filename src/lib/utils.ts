import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Formats time string to remove seconds
 * @param time - Time string in format "HH:MM:SS" or "HH:MM"
 * @returns Time string in format "HH:MM"
 */
export function formatTimeWithoutSeconds(time: string | undefined): string {
  if (!time) return '';

  // If time already doesn't have seconds, return as is
  if (time.split(':').length === 2) {
    return time;
  }

  // Remove seconds from time string (HH:MM:SS -> HH:MM)
  return time.split(':').slice(0, 2).join(':');
}

export function formatFullNameAndDogName(
  ownerFullName: string,
  dogName?: string | null
): string {
  const trimmedDogName = dogName?.trim();
  if (trimmedDogName && trimmedDogName.toLowerCase() !== 'n/a' && trimmedDogName !== '') {
    return `${ownerFullName} w/ ${trimmedDogName}`;
  }
  return ownerFullName;
}

export function formatPhoneNumber(phoneNumber?: string): string | undefined {
  if (!phoneNumber) {
    return undefined;
  }
  // Simple check: if it doesn't start with '0' or '+', prepend '0'.
  // This is a basic heuristic and might need to be more robust for various number formats.
  const trimmedNumber = phoneNumber.trim();
  if (trimmedNumber.length > 0 && !trimmedNumber.startsWith('0') && !trimmedNumber.startsWith('+')) {
    return '0' + trimmedNumber;
  }
  return trimmedNumber;
}

/**
 * Formats a number as currency (GBP)
 * @param amount - The amount to format
 * @returns Formatted currency string
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
  }).format(amount);
}

/**
 * Formats a date string to DD/MM/YYYY format (British format)
 * @param dateString - Date string in YYYY-MM-DD format
 * @returns Formatted date string
 */
export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
