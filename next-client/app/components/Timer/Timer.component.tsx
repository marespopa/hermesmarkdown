import DateUtils from "@/app/services/date-utils";
import {
  FaCross,
  FaMugHot,
  FaPause,
  FaPlay,
  FaRecycle,
  FaRegWindowMaximize,
  FaRegWindowMinimize,
  FaTerminal,
  FaWindowClose,
} from "react-icons/fa";

import Button from "../Button";
import { useEffect, useState } from "react";
import { useDocumentTitle } from "@/app/hooks/use-document-title";
import TimerSettingsTrigger from "./TimerSettingsTrigger";
import { useAtom } from "jotai";
import { atom_frontMatter } from "@/app/atoms/atoms";
import useIsMobile from "@/app/hooks/use-is-mobile";

type Props = {
  isWorking: boolean;
  isResting: boolean;
  isTimerCounting: boolean;
  mainTime: number;
  startWorkInterval: () => void;
  startRestInterval: (long: boolean) => void;
  resetPomodoro: () => void;
  togglePauseFn: () => () => void;
  numberOfPomodoros: number;
  completedCycles: number;
  onClose?: () => void;
};

const TimerComponent = ({
  isWorking,
  isResting,
  isTimerCounting,
  mainTime,
  startWorkInterval,
  startRestInterval,
  resetPomodoro,
  togglePauseFn,
  numberOfPomodoros,
  completedCycles,
  onClose,
}: Props) => {
  const [isTimerMinimized, setIsTimerMinimized] = useState(true);
  const isPauseButtonVisible = isWorking || isResting;
  const [_, setDocumentTitle] = useDocumentTitle("Hermes Markdown");
  const [frontMatter] = useAtom(atom_frontMatter);
  const fileTitle = frontMatter.title || "File";
  const isMobile = useIsMobile();

  useEffect(() => {
    const pomodoroSettings = {
      isWorking,
      isResting,
      isTimerCounting,
      time: mainTime,
    };

    const title = getHeadingText(pomodoroSettings, fileTitle, true);

    setDocumentTitle(title);
  }, [
    isResting,
    isTimerCounting,
    isWorking,
    mainTime,
    fileTitle,
    setDocumentTitle,
  ]);

  const pomodoroSettings = {
    isWorking,
    isResting,
    isTimerCounting,
    time: mainTime,
  };

  return (
    <section className={`${timerPopStyles}`}>
      <h2
        className="font-bold flex justify-between cursor-pointer text-gray-900 dark:text-white"
        onClick={() => toggleTimerWindow()}
      >
        <span className="flex items-center gap-2">
          {getHeadingText(pomodoroSettings, fileTitle, false)}
          {!isTimerCounting && (isWorking || isResting) && (
            <span className="text-xs bg-yellow-500 dark:bg-yellow-600 text-white px-2 py-1 rounded">
              PAUSED
            </span>
          )}
        </span>
        <span className="flex items-center gap-2">
          {isTimerMinimized ? <FaRegWindowMaximize /> : <FaRegWindowMinimize />}
          {onClose && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              className="hover:text-red-500 transition-colors p-1 rounded focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
              title="Close timer"
              aria-label="Close timer"
            >
              <FaWindowClose className="w-4 h-4" />
            </button>
          )}
        </span>
      </h2>
      {!isTimerMinimized && renderDetails()}
    </section>
  );

  function renderDetails() {
    return (
      <>
        <div className="pb-8 sm:pb-0">{renderControlButtons()}</div>

        {!isMobile && (
          <div className="mt-2 pb-8">
            <p className="text-xs italic text-gray-700 dark:text-gray-300">
              One finished cycle consists in four finished pomodoros
            </p>
            <div className="mt-4 text-sm">
              <dl className="flex gap-4 text-gray-900 dark:text-white">
                <dt className="font-medium leading-6">Finished pomodoros:</dt>
                <dd className="font-bold leading-6">{numberOfPomodoros}</dd>

                <dt className="font-medium leading-6">Finished cycles</dt>
                <dd className="font-bold leading-6">{completedCycles}</dd>
              </dl>
            </div>
          </div>
        )}
      </>
    );
  }

  function renderControlButtons() {
    return (
      <div className="flex gap-4 mt-4 justify-center flex-wrap">
        {!isResting && !isWorking && !isTimerCounting && (
          <Button
            variant="success"
            label={
              <>
                START <FaPlay />
              </>
            }
            handler={() => startWorkInterval()}
            styles="text-xs"
          ></Button>
        )}
        {isResting && (
          <Button
            variant="secondary"
            label={
              <>
                WORK <FaTerminal />
              </>
            }
            handler={() => startWorkInterval()}
            styles="text-xs"
          ></Button>
        )}
        {isWorking && (
          <Button
            variant="secondary"
            label={
              <>
                BREAK <FaMugHot />
              </>
            }
            handler={() => startRestInterval(false)}
            styles="text-xs"
          ></Button>
        )}
        {isPauseButtonVisible && (
          <Button
            variant={"secondary"}
            label={
              isTimerCounting ? (
                <>
                  PAUSE <FaPause />
                </>
              ) : (
                <>
                  GO <FaPlay />
                </>
              )
            }
            handler={togglePauseFn()}
            styles="text-xs"
          ></Button>
        )}
        {(isPauseButtonVisible || isTimerCounting) && (
          <Button
            variant="danger"
            label={
              <>
                RESET <FaRecycle />
              </>
            }
            handler={() => resetPomodoro()}
            styles="text-xs"
          ></Button>
        )}
        {<TimerSettingsTrigger />}
      </div>
    );
  }

  function toggleTimerWindow() {
    setIsTimerMinimized(!isTimerMinimized);
  }
};

function getHeadingText(
  pomodoro: {
    isWorking: boolean;
    isResting: boolean;
    isTimerCounting: boolean;
    time: number; // in Minutes
  },
  fileTitle: string,
  isDocumentTitle: boolean
) {
  const { isWorking, isResting, isTimerCounting, time } = pomodoro;
  const formattedTime = DateUtils.getFormattedTimeFromMs(time * 1000);
  const usageBasedText = isDocumentTitle ? `/ ${fileTitle}` : "";

  if (isTimerCounting) {
    return `${formattedTime} - ${
      isWorking ? `Work` : `Break`
    } ${usageBasedText}`;
  }

  if (isWorking) {
    return `Work - Paused ${usageBasedText}`;
  }

  if (isResting) {
    return `Break - Paused ${usageBasedText}`;
  }

  return isDocumentTitle ? `${fileTitle}` : "Pomodoro Timer";
}

const timerPopStyles = `bg-amber-100 dark:bg-gray-800 shadow-sm py-2 px-2 md:px-4 pt-2 my-4 rounded-sm
                        w-full z-10 opacity-95 relative
                        sm:w-full
                        md:fixed md:bottom-4 md:right-4 md:w-96 md:max-w-md md:left-auto`;

export default TimerComponent;
