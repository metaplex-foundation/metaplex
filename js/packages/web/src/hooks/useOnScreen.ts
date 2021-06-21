import { useState, useEffect } from 'react';

export const useOnScreen = (ref: any) => {
  const [isIntersecting, setIntersecting] = useState(false);

  const observer = new IntersectionObserver(([entry]) => {
    console.log(entry);
    setIntersecting(entry.isIntersecting);
  });

  useEffect(() => {
    if (ref.current) {
      observer.observe(ref.current);
    }
    // Remove the observer as soon as the component is unmounted
    return () => {
      observer.disconnect();
    };
  }, []);

  return isIntersecting;
};
