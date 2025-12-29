import { useEffect, useRef } from 'react';

export function useInterval(callback: Function, delay: number) {
    const savedCallback = useRef<Function>(() => { });

    useEffect(() => {
        savedCallback.current = callback;
    }, [callback]);

    useEffect(() => {
        if (delay) {
            const interval = setInterval(() => savedCallback.current(), delay);
            return () => clearInterval(interval);
        }
    }, [delay]);
}