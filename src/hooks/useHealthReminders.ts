import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { toast } from 'sonner';

const REMINDER_KEYS = {
  water: 'last_reminder_water',
  stand: 'last_reminder_stand',
  eye: 'last_reminder_eye'
};

export const useHealthReminders = () => {
  const { aiConfig } = useAppStore();
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

  const checkReminders = () => {
    const now = Date.now();

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
  }, [healthReminders]); // Re-run if config changes
};
