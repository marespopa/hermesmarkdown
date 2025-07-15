const DateUtils = {
  getDate(): string {
    return formatDate(new Date(), '-');
  },
  getCurrentYear(): string {
    return new Date().getFullYear().toString();
  },
  getCurrentMonth(): string {
    return new Date().toLocaleString('default', { month: 'long' });
  },
  getYear() {
    const date = new Date();
    const year = date.getFullYear();
    return year;
  },
  getMonth() {
    const date = new Date();
    const month = date.toLocaleString("default", { month: "long" });
    return month;
  },
  getFormattedTimeFromMs(milliseconds: number) {
    let seconds = Math.floor(milliseconds / 1000);
    let minutes = Math.floor(seconds / 60);
    let hours = Math.floor(minutes / 60);
    seconds = seconds % 60;
    minutes = minutes % 60;
    hours = hours % 24;
    const hoursString = hours > 0 ? `${padTo2Digits(hours)}h ` : "";
    return `${hoursString}${padTo2Digits(minutes)}m ${padTo2Digits(seconds)}s`;
  },
  getDatesOfCurrentWeek(separator = '-') {
    const currentDate = new Date();
    // Find the start of the week (Monday)
    const startOfWeek = new Date(
      currentDate.setDate(currentDate.getDate() - currentDate.getDay() + 1)
    );
    // Generate the dates for the current week
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      dates.push(formatDate(date, separator));
    }
    return dates;
  },
};

function padTo2Digits(num: number) {
  return num.toString().padStart(2, "0");
}

function formatDate(date: Date, separator: string) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return [year, month, day].join(separator);
}

export default DateUtils;