import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
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
