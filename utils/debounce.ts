import { useEffect, useRef } from 'react';

function useDebounce(value: any, delay: number): any {
    const timeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            // This is where the debounced value would be 'returned' or used.
        }, delay);

        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, [value, delay]);

    return value; // You might want to return the debounced value.
}

export default useDebounce;