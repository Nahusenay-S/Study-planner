declare module 'lucide-react';
declare module 'date-fns' {
    export function differenceInDays(dateLeft: Date | number, dateRight: Date | number): number;
    export function parseISO(argument: string, options?: any): Date;
    export function startOfDay(date: Date | number): Date;
    // Add any other functions that might be missing
}
