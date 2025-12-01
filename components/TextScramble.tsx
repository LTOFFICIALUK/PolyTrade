'use client';

import { type JSX, useEffect, useState } from 'react';

import { motion, MotionProps } from 'framer-motion';



type TextScrambleProps = {

  children: string;

  duration?: number;

  speed?: number;

  characterSet?: string;

  as?: React.ElementType;

  className?: string;

  trigger?: boolean;

  onScrambleComplete?: () => void;

} & MotionProps;



const defaultChars =

  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';



export function TextScramble({

  children,

  duration = 0.8,

  speed = 0.04,

  characterSet = defaultChars,

  className,

  as: Component = 'p',

  trigger = true,

  onScrambleComplete,

  ...props

}: TextScrambleProps) {

  const MotionComponent = motion.create(

    Component as keyof JSX.IntrinsicElements

  );

  const [displayText, setDisplayText] = useState(children);

  const [isAnimating, setIsAnimating] = useState(false);



  const scramble = async () => {

    if (isAnimating) return;

    setIsAnimating(true);

    const targetText = children;

    const steps = duration / speed;

    let step = 0;



    const interval = setInterval(() => {

      let scrambled = '';

      const progress = step / steps;



      for (let i = 0; i < targetText.length; i++) {

        if (targetText[i] === ' ') {

          scrambled += ' ';

          continue;

        }



        if (progress * targetText.length > i) {

          scrambled += targetText[i];

        } else {

          scrambled +=

            characterSet[Math.floor(Math.random() * characterSet.length)];

        }

      }



      setDisplayText(scrambled);

      step++;



      if (step > steps) {

        clearInterval(interval);

        setDisplayText(targetText);

        setIsAnimating(false);

        onScrambleComplete?.();

      }

    }, speed * 1000);

  };



  useEffect(() => {

    if (!trigger) return;

    scramble();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger, children]);



  // Update displayText when children changes (without animation)

  useEffect(() => {

    if (!isAnimating) {

      setDisplayText(children);

    }

  }, [children, isAnimating]);



  return (

    <MotionComponent className={className} {...props}>

      {displayText}

    </MotionComponent>

  );

}

