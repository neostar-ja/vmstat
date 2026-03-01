
import { useEffect, useRef } from 'react';

export const useIdleTimer = (onIdle: () => void, idleTime: number = 1000 * 60 * 30) => {
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const resetTimer = () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            timerRef.current = setTimeout(onIdle, idleTime);
        };

        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Initial set
        resetTimer();

        // Add listeners
        events.forEach(event => {
            window.addEventListener(event, resetTimer);
        });

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
            }
            events.forEach(event => {
                window.removeEventListener(event, resetTimer);
            });
        };
    }, [onIdle, idleTime]);
};
