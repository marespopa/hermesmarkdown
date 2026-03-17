"use client";

import React, { useState, useEffect } from 'react';

const Greetings = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);


const getGreeting = () => {
  const hour = currentTime.getHours();

  if (hour >= 5 && hour < 12) return "Good morning!";
  if (hour >= 12 && hour < 17) return "Good afternoon!";
  if (hour >= 17 && hour < 22) return "Good evening!";
  return "Working late.";
};

  return (
    <div 
      className="
        group flex items-center gap-2 px-3 py-1.5
        bg-transparent border-none cursor-pointer
        hover:bg-neutral-100 dark:hover:bg-neutral-800/50
        rounded-full transition-all duration-300
      "
    >
      <span className="text-xs font-medium tracking-tight text-neutral-500 dark:text-neutral-400">
        {getGreeting()}
      </span>
    </div>
  );
};

export default Greetings;
