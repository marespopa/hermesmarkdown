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
          <Button
            variant="icon"
            onClick={(e) => {
              e.stopPropagation();
              setIsTimerMinimized((v) => !v);
            }}
            aria-label={isTimerMinimized ? "Maximize timer" : "Minimize timer"}
            title={isTimerMinimized ? "Maximize timer" : "Minimize timer"}
          >
            {isTimerMinimized ? <FaRegWindowMaximize /> : <FaRegWindowMinimize />}
          </Button>
          {onClose && (
            <Button
              variant="icon"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
              }}
              aria-label="Close timer"
              title="Close timer"
            >
              <FaWindowClose />
            </Button>
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
            variant="primary"
            label={
              <>
                START <FaPlay />
              </>
            }
            onClick={() => startWorkInterval()}
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
            onClick={() => startWorkInterval()}
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
            onClick={() => startRestInterval(false)}
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
            onClick={togglePauseFn()}
          ></Button>
        )}
        {(isPauseButtonVisible || isTimerCounting) && (
          <Button
            variant="secondary"
            label={
              <>
                RESET <FaRecycle />
              </>
            }
            onClick={() => resetPomodoro()}
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
    return `${formattedTime} - ${isWorking ? `Work` : `Break`
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

const timerPopStyles = `bg-white dark:bg-neutral-800 shadow-lg border border-strongblack dark:border-white/20 py-2 px-2 my-8 rounded-2xl w-full opacity-95 relative`;

export default TimerComponent;
