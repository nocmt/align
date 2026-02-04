import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { toast } from 'sonner';
import { WorkSchedule } from '@/types';

const REMINDER_KEYS = {
  water: 'last_reminder_water',
  stand: 'last_reminder_stand',
  eye: 'last_reminder_eye'
};

export const useHealthReminders = () => {
  const { aiConfig, workSchedule } = useAppStore();
  const { healthReminders } = aiConfig;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Helper to send notification
  const sendNotification = (title: string, body: string, icon: string) => {
    // Toast
    toast.info(title, {
      description: body,
      duration: 10000, // Show for 10s
      icon: icon
    });

    // System Notification
    if ('Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          icon: '/vite.svg',
          requireInteraction: true
        });
      } catch (e) {
        console.error('【健康提醒】发送通知失败:', e);
      }
    }
  };

  // Helper to check if it is work time
  const isWorkTime = (now: number, schedule: WorkSchedule): boolean => {
    if (!schedule) return true; // Fail safe

    const date = new Date(now);
    const dayOfWeek = date.getDay(); // 0 (Sun) - 6 (Sat)
    
    // Get local date string YYYY-MM-DD for holiday check
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const todayStr = `${year}-${month}-${day}`;

    // Check holidays
    const holiday = schedule.holidays?.find(h => 
      todayStr >= h.startDate && todayStr <= h.endDate
    );

    let isWorkDay = false;
    if (holiday) {
      isWorkDay = holiday.isWorkDay;
    } else {
      isWorkDay = schedule.workDays.includes(dayOfWeek);
    }

    if (!isWorkDay) return false;

    // Check time
    const currentMinutes = date.getHours() * 60 + date.getMinutes();
    
    const parseTime = (timeStr: string) => {
      if (!timeStr) return 0;
      const [h, m] = timeStr.split(':').map(Number);
      return h * 60 + m;
    };

    const workStart = parseTime(schedule.workStartTime);
    const workEnd = parseTime(schedule.workEndTime);
    const lunchStart = parseTime(schedule.lunchStartTime);
    const lunchEnd = parseTime(schedule.lunchEndTime);

    // Must be within work hours
    if (currentMinutes < workStart || currentMinutes > workEnd) return false;

    // Must NOT be within lunch break (if lunch time is configured)
    if (lunchStart > 0 && lunchEnd > 0 && currentMinutes >= lunchStart && currentMinutes < lunchEnd) return false;

    // Check excluded time slots
    if (schedule.excludedTimeSlots && schedule.excludedTimeSlots.length > 0) {
      for (const slot of schedule.excludedTimeSlots) {
        // If slot has date, check if matches today
        if (slot.date && slot.date !== todayStr) continue;
        
        const slotStart = parseTime(slot.startTime);
        const slotEnd = parseTime(slot.endTime);
        
        if (currentMinutes >= slotStart && currentMinutes < slotEnd) {
          return false;
        }
      }
    }

    return true;
  };

  const checkReminders = () => {
    const now = Date.now();

    // Check if work time
    if (!isWorkTime(now, workSchedule)) {
      return;
    }

    // Helper to check and trigger
    const checkOne = (
      key: string, 
      enabled: boolean, 
      intervalMinutes: number, 
      title: string, 
      body: string, 
      icon: string
    ) => {
      if (!enabled || intervalMinutes <= 0) return;

      const lastTimeStr = localStorage.getItem(key);
      if (!lastTimeStr) {
        // First run, initialize to now to start counting
        localStorage.setItem(key, now.toString());
        return;
      }

      const lastTime = parseInt(lastTimeStr, 10);
      const intervalMs = intervalMinutes * 60 * 1000;

      if (now - lastTime >= intervalMs) {
        sendNotification(title, body, icon);
        localStorage.setItem(key, now.toString());
      }
    };

    // Check Water
    checkOne(
      REMINDER_KEYS.water,
      healthReminders.waterReminder,
      healthReminders.waterInterval,
      '该喝水了 💧',
      '保持水分充足有助于提高工作效率',
      '💧'
    );

    // Check Stand
    checkOne(
      REMINDER_KEYS.stand,
      healthReminders.standReminder,
      healthReminders.standInterval,
      '起来活动一下 🧘',
      '久坐伤身，站起来走动走动吧',
      '🧘'
    );

    // Check Eye
    checkOne(
      REMINDER_KEYS.eye,
      healthReminders.eyeRestReminder,
      healthReminders.eyeRestInterval,
      '休息一下眼睛 👀',
      '眺望远方或做眼保健操，缓解视疲劳',
      '👀'
    );
  };

  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Initial check
    checkReminders();

    // Check every minute
    intervalRef.current = setInterval(checkReminders, 60 * 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [healthReminders, workSchedule]); // Re-run if config or schedule changes
};
