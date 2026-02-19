import { useState } from "react";
import { useLayoutStore } from "@/stores/layoutStore";
import { 
  addYears, 
  addMonths, 
  addWeeks, 
  addDays 
} from "date-fns-jalali";
import { 
  getPersianMonth, 
  getJalaliYear, 
  toPersianDigits 
} from "@/lib/jalali";

export const useHeaderLogic = () => {
  const { 
    currentDate, 
    setCurrentDate, 
    jumpToToday, 
    viewMode, 
    setViewMode 
  } = useLayoutStore();

  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleNav = (dir: 1 | -1) => {
    switch (viewMode) {
      case 'year':
        setCurrentDate(addYears(currentDate, dir));
        break;
      case 'month':
        setCurrentDate(addMonths(currentDate, dir));
        break;
      case 'week':
        setCurrentDate(addWeeks(currentDate, dir));
        break;
      case 'day':
      case 'agenda':
        if (viewMode === 'agenda') {
            setCurrentDate(addMonths(currentDate, dir));
        } else {
            setCurrentDate(addDays(currentDate, dir));
        }
        break;
      default:
        setCurrentDate(addWeeks(currentDate, dir));
    }
  };

  const getTitle = () => {
    if (viewMode === 'year') {
      return toPersianDigits(getJalaliYear(currentDate));
    }
    return `${getPersianMonth(currentDate)} ${toPersianDigits(getJalaliYear(currentDate))}`;
  };

  const handleHardRefresh = async () => {
    setIsRefreshing(true);
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        await registration.unregister();
      }
    }
    window.location.reload();
  };

  return {
    currentDate,
    setCurrentDate, // <--- EXPORTED NOW
    viewMode,
    setViewMode,
    handleNav,
    jumpToToday,
    title: getTitle(),
    handleHardRefresh,
    isRefreshing
  };
};