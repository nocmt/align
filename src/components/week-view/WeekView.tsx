/**
 * 周视图组件 - 显示一周的任务安排
 * 包含时间网格、任务卡片、当前时间指示器
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Task, TaskCategory, TaskPriority } from '@/types';
import { format, startOfWeek, addDays, isSameDay, addHours, startOfHour } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import TaskCard from './TaskCard';
import TimeIndicator from './TimeIndicator';
import { useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

/**
 * 时间槽组件
 */
interface TimeSlotProps {
  day: Date;
  slot: { hour: number; minute: number };
  tasks: Task[];
  isToday: boolean;
  currentTime: Date;
  moveTask: (id: string, start: Date, end: Date) => void;
  getTaskStyle: (task: Task, date: Date) => any;
  isHourMark: boolean;
}

const TimeSlot: React.FC<TimeSlotProps> = ({ 
  day, 
  slot, 
  tasks, 
  isToday, 
  currentTime, 
  moveTask, 
  getTaskStyle,
  isHourMark 
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (item: { id: string; estimatedDuration: number }) => {
      const newStart = new Date(day);
      newStart.setHours(slot.hour, slot.minute, 0, 0);
      const newEnd = new Date(newStart.getTime() + item.estimatedDuration * 60000);
      moveTask(item.id, newStart, newEnd);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return (
    <div
      ref={drop}
      className={`h-10 border-b border-gray-100 relative ${
        isHourMark ? 'border-b-gray-200' : ''
      } ${isOver ? 'bg-gray-100' : 'hover:bg-gray-50'} transition-colors`}
    >
      {/* 当前时间指示器 */}
      {isToday && (
        <TimeIndicator
          currentTime={currentTime}
          day={day}
          hour={slot.hour}
          minute={slot.minute}
        />
      )}
      
      {/* 任务卡片 */}
      {tasks.map(task => (
        <TaskCard
          key={task.id}
          task={task}
          style={getTaskStyle(task, day)}
          compact={true}
        />
      ))}
    </div>
  );
};

/**
 * 周视图属性接口
 */
interface WeekViewProps {
  className?: string;
}

/**
 * 周视图组件
 */
const WeekView: React.FC<WeekViewProps> = ({ className = '' }) => {
  const { 
    tasks, 
    currentWeek, 
    selectedView,
    selectedCategory,
    moveTask,
    openModal
  } = useAppStore();
  const [currentTime, setCurrentTime] = useState(new Date());

  // 更新当前时间
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // 每分钟更新一次

    return () => clearInterval(timer);
  }, []);

  // 计算周的开始和结束日期
  const weekStart = useMemo(() => startOfWeek(currentWeek, { weekStartsOn: 1 }), [currentWeek]);
  const weekDays = useMemo(() => {
    if (selectedView === 'day') {
      return [currentTime]; // 日视图只显示今天
    }
    return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  }, [weekStart, selectedView, currentTime]);

  // 时间槽（6:00 - 24:00，每30分钟一个槽）
  const timeSlots = useMemo(() => {
    const slots = [];
    for (let hour = 6; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += 30) {
        slots.push({ hour, minute });
      }
    }
    return slots;
  }, []);

  // 根据筛选条件过滤任务
  const filteredTasks = useMemo(() => {
    if (selectedCategory === 'all') return tasks;
    return tasks.filter(task => task.category === selectedCategory);
  }, [tasks, selectedCategory]);

  // 获取指定日期和时间开始的任务（解决重复显示问题）
  const getTasksForTimeSlot = (date: Date, hour: number, minute: number): Task[] => {
    const slotStart = new Date(date);
    slotStart.setHours(hour, minute, 0, 0);
    
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);

    return filteredTasks.filter(task => {
      const taskStart = new Date(task.startTime);
      // 只返回在这个时间槽开始的任务
      return isSameDay(taskStart, date) && 
             taskStart >= slotStart && 
             taskStart < slotEnd;
    });
  };

  // 计算任务在时间网格中的位置和高度
  const getTaskStyle = (task: Task, date: Date) => {
    const taskStart = new Date(task.startTime);
    const taskEnd = new Date(task.endTime);
    
    if (!isSameDay(taskStart, date)) return null;

    const startHour = taskStart.getHours();
    const startMinute = taskStart.getMinutes();
    const endHour = taskEnd.getHours();
    const endMinute = taskEnd.getMinutes();

    // 计算开始位置（从6:00开始，每30分钟一行）
    // 注意：这里不需要计算top，因为任务是放在对应的时间槽里的
    // 但是我们需要计算height
    
    // 计算总持续时间（分钟）
    const durationMinutes = (taskEnd.getTime() - taskStart.getTime()) / 60000;
    const height = (durationMinutes / 30) * 40; // 每30分钟40px

    return {
      top: '0px', // 始终从当前槽顶部开始
      height: `${height}px`,
      left: '8px',
      right: '8px',
      position: 'absolute' as const,
      zIndex: 10
    };
  };

  // 如果是列表或看板视图，显示开发中提示
  if (selectedView === 'list' || selectedView === 'kanban') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-gray-50">
        <div className="text-center p-8 bg-white rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {selectedView === 'list' ? '列表视图' : '看板视图'}开发中
          </h3>
          <p className="text-gray-500">
            我们正在努力开发此功能，敬请期待！
          </p>
          <button
            onClick={() => useAppStore.getState().setSelectedView('week')}
            className="mt-4 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors text-sm"
          >
            返回周视图
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white overflow-hidden">
      {/* 顶部日期栏 */}
      <div className="flex border-b border-gray-200">
        <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50"></div>
        {weekDays.map((day, index) => {
          const isToday = isSameDay(day, new Date());
          return (
            <div 
              key={day.toISOString()} 
              className={`flex-1 py-3 text-center border-r border-gray-200 last:border-r-0 ${
                isToday ? 'bg-black text-white' : 'bg-white'
              }`}
            >
              <div className={`text-xs mb-1 ${isToday ? 'text-gray-300' : 'text-gray-500'}`}>
                {format(day, 'EEE', { locale: zhCN })}
              </div>
              <div className={`text-lg font-semibold ${isToday ? 'text-white' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
            </div>
          );
        })}
      </div>

      {/* 时间网格 */}
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <div className="flex min-h-full">
          {/* 时间轴 */}
          <div className="w-16 flex-shrink-0 border-r border-gray-200 bg-gray-50">
            {timeSlots.map(({ hour, minute }) => (
              <div 
                key={`${hour}:${minute}`} 
                className={`h-10 text-right pr-2 text-xs text-gray-400 relative -top-2 ${
                  minute === 0 ? '' : 'invisible'
                }`}
              >
                {minute === 0 ? `${hour}:00` : ''}
              </div>
            ))}
          </div>

          {/* 任务网格 */}
          {weekDays.map((day) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={day.toISOString()} className="flex-1 border-r border-gray-100 last:border-r-0 relative">
                {timeSlots.map((slot) => (
                  <TimeSlot
                    key={`${slot.hour}:${slot.minute}`}
                    day={day}
                    slot={slot}
                    tasks={getTasksForTimeSlot(day, slot.hour, slot.minute)}
                    isToday={isToday}
                    currentTime={currentTime}
                    moveTask={moveTask}
                    getTaskStyle={getTaskStyle}
                    isHourMark={slot.minute === 30}
                  />
                ))}
                
                {/* 当前时间线 */}
                {isToday && (
                  <div 
                    className="absolute w-full border-t-2 border-red-500 z-20 pointer-events-none"
                    style={{
                      top: `${((currentTime.getHours() - 6) * 60 + currentTime.getMinutes()) / 30 * 40}px`
                    }}
                  >
                    <div className="absolute -left-1.5 -top-1.5 w-3 h-3 bg-red-500 rounded-full" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default WeekView;