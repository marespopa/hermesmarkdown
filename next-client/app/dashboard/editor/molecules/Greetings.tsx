import React, { useState, useEffect } from 'react';
import { FiSunrise, FiSun, FiMoon } from 'react-icons/fi';
import { BsCupHot } from 'react-icons/bs';

const Greetings = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  const getGreeting = () => {
    const hour = currentTime.getHours();

    if (hour >= 5 && hour < 12) {
      return { 
        text: "Good Morning", 
        icon: <FiSunrise />, 
        iconCol: "text-amber-600 dark:text-amber-400" 
      };
    } else if (hour >= 12 && hour < 17) {
      return { 
        text: "Good Afternoon", 
        icon: <FiSun />, 
        iconCol: "text-amber-500 dark:text-amber-300" 
      };
    } else if (hour >= 17 && hour < 22) {
      return { 
        text: "Good Evening", 
        icon: <FiMoon />, 
        iconCol: "text-indigo-600 dark:text-indigo-400" 
      };
    } else {
      return { 
        text: "Working Late", 
        icon: <BsCupHot />, 
        iconCol: "text-rose-500 dark:text-rose-400" 
      };
    }
  };

  const { text, icon, iconCol } = getGreeting();

  return (
    <div className="
      flex items-center gap-3 px-4 py-2 rounded-lg border 
      /* Light Mode: Primary Amber-100 */
      bg-amber-200 border-amber-300 text-amber-900 
      /* Dark Mode: Deep Slate/Zinc */
      dark:bg-zinc-800 dark:border-zinc-700 dark:text-zinc-100 
      transition-colors duration-300 shadow-sm
    ">
      <span className={`text-xl ${iconCol}`}>
        {icon}
      </span>
      <span className="font-medium tracking-tight">
        {text}
      </span>
    </div>
  );
};

export default Greetings;
