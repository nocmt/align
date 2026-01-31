import { useEffect, useRef } from 'react';
import { useAppStore } from '@/store';
import { differenceInMinutes } from 'date-fns';
import { toast } from 'sonner';

export const useTaskReminder = () => {
  const { tasks } = useAppStore();
  // Store notified task keys to avoid duplicate notifications
  // Key format: `${taskId}-${startTime}-${reminderMinutes}`
  const notifiedTasksRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    const checkReminders = () => {
      const now = new Date();
      
      tasks.forEach(task => {
        // Skip completed or paused tasks
        if (task.status === 'completed' || task.status === 'paused') return;
        if (!task.startTime) return;

        const startTime = new Date(task.startTime);
        const reminderMinutes = task.reminderMinutes ?? 5;
        const key = `${task.id}-${startTime.getTime()}-${reminderMinutes}`;

        if (notifiedTasksRef.current.has(key)) return;

        const reminderTime = new Date(startTime.getTime() - reminderMinutes * 60000);
        
        // Calculate difference in minutes
        // We check if now is same minute or just past the reminder time
        const diff = differenceInMinutes(now, reminderTime);

        // Trigger if we are within 0-1 minute of the reminder time
        if (diff === 0) {
           sendNotification(task.title, `任务将在 ${reminderMinutes} 分钟后开始`);
           notifiedTasksRef.current.add(key);
        }
      });
    };

    // Check every 10 seconds to be more precise
    const intervalId = setInterval(checkReminders, 10000);
    
    // Check immediately
    checkReminders();

    return () => clearInterval(intervalId);
  }, [tasks]);
};

const sendNotification = (title: string, body: string) => {
  // Always show toast inside the app
  toast.info(title, { 
    description: body,
    duration: 5000,
    icon: '⏰'
  });

  // Try to send system notification
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(title, {
        body,
        icon: '/vite.svg', // Assuming this exists or browser default
        requireInteraction: true // Keep it visible until user interacts
      });
    } catch (e) {
      console.error('【任务提醒】发送通知失败:', e);
    }
  }
};
