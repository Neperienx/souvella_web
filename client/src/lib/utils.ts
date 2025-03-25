import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date);
}

// Helper to get month name
export function getMonthName(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { month: 'short' }).format(date);
}

// Helper to get year
export function getYear(date: Date): string {
  return new Intl.DateTimeFormat('en-US', { year: 'numeric' }).format(date);
}

// Create an array of months going back from current date
export function getLastNMonths(n: number): Array<{ month: string, year: string, date: Date }> {
  const today = new Date();
  const months: Array<{ month: string, year: string, date: Date }> = [];

  for (let i = 0; i < n; i++) {
    const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
    months.push({
      month: getMonthName(date),
      year: getYear(date),
      date
    });
  }

  return months;
}

// Function to generate random position for tape elements
export function getTapePosition(index: number): string {
  const positions = [
    "-left-4 -top-1 rotate-3",
    "-right-5 -top-1 rotate-6",
    "-left-6 top-10 rotate-12",
    "-right-3 -top-2 rotate-6",
    "-left-3 -top-2 rotate-6"
  ];
  
  return positions[index % positions.length];
}

// Function to determine if a user has uploaded a memory today
export function hasUploadedToday(memories: any[], userId: string): boolean {
  const today = new Date();
  const todayString = today.toISOString().split('T')[0];
  
  return memories.some(memory => {
    const memoryDate = new Date(memory.createdAt).toISOString().split('T')[0];
    return memory.userId === userId && memoryDate === todayString;
  });
}
