'use client';

import { useEffect, useRef, useState } from 'react';
import { TextScramble } from './TextScramble';

interface AnimatedPriceProps {
  value: number | string;
  format?: (value: number) => string;
  className?: string;
  suffix?: string;
  prefix?: string;
  duration?: number;
  speed?: number;
}

const AnimatedPrice = ({
  value,
  format,
  className = '',
  suffix = '',
  prefix = '',
  duration = 0.3,
  speed = 0.015,
}: AnimatedPriceProps) => {
  const [version, setVersion] = useState(0);
  const previousValueRef = useRef<number | string | null>(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    // Convert value to number for comparison
    const numericValue = typeof value === 'string' ? parseFloat(value) : value;
    const prevNumericValue = typeof previousValueRef.current === 'string' 
      ? parseFloat(previousValueRef.current) 
      : previousValueRef.current;

    // Only trigger animation if value actually changed (not on first render)
    // Use a small epsilon to handle floating point precision
    const hasChanged = prevNumericValue !== null && 
      (isNaN(numericValue) !== isNaN(prevNumericValue) || 
       (!isNaN(numericValue) && !isNaN(prevNumericValue) && Math.abs(numericValue - prevNumericValue) > 0.001));

    if (!isFirstRender.current && hasChanged) {
      setVersion((v) => v + 1);
    }
    if (isFirstRender.current) {
      isFirstRender.current = false;
    }
    previousValueRef.current = value;
  }, [value]);

  const formatValue = () => {
    if (typeof value === 'string') {
      return value;
    }
    if (isNaN(value) || !isFinite(value)) {
      return '0';
    }
    if (format) {
      return format(value);
    }
    return value.toString();
  };

  const formattedText = formatValue();
  const displayText = `${prefix}${formattedText}`;

  return (
    <span className={className ? undefined : 'inline'}>
      <TextScramble
        key={version}
        trigger={version > 0}
        duration={duration}
        speed={speed}
        className={className}
        as="span"
      >
        {displayText}
      </TextScramble>
      {suffix}
    </span>
  );
};

export default AnimatedPrice;

