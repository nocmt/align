/**
 * 时间指示器组件 - 显示当前时间在周视图中的位置
 */

import React from 'react';
import { isSameDay, getHours, getMinutes } from 'date-fns';

/**
 * 时间指示器属性接口
 */
interface TimeIndicatorProps {
  currentTime: Date;
  day: Date;
  hour: number;
  minute: number;
}

/**
 * 时间指示器组件
 * 在当前时间对应的时间槽中显示黑色指示线
 */
const TimeIndicator: React.FC<TimeIndicatorProps> = ({
  currentTime,
  day,
  hour,
  minute
}) => {
  // 检查当前时间是否在当前时间槽内
  const isCurrentTimeSlot = () => {
    if (!isSameDay(currentTime, day)) {
      return false;
    }

    const currentHour = getHours(currentTime);
    const currentMinute = getMinutes(currentTime);

    // 检查小时
    if (currentHour !== hour) {
      return false;
    }

    // 检查分钟范围（每30分钟一个槽）
    const slotStartMinute = minute;
    const slotEndMinute = minute + 30;

    return currentMinute >= slotStartMinute && currentMinute < slotEndMinute;
  };

  // 计算指示器在时间槽内的相对位置
  const getIndicatorPosition = () => {
    const currentHour = getHours(currentTime);
    const currentMinute = getMinutes(currentTime);

    if (currentHour !== hour) {
      return null;
    }

    // 计算在当前30分钟槽内的相对位置（百分比）
    const slotStartMinute = minute;
    const slotEndMinute = minute + 30;
    const relativeMinute = currentMinute - slotStartMinute;
    const percentage = (relativeMinute / 30) * 100;

    return percentage;
  };

  if (!isCurrentTimeSlot()) {
    return null;
  }

  const position = getIndicatorPosition();
  
  return (
    <div 
      className="absolute left-0 right-0 h-0.5 bg-black z-10"
      style={{
        top: position !== null ? `${position}%` : '50%',
        boxShadow: '0 0 2px rgba(0, 0, 0, 0.2)'
      }}
    >
      {/* 时间标记点 */}
      <div 
        className="absolute left-0 w-2 h-2 bg-black rounded-full transform -translate-y-1/2"
        style={{ left: '4px' }}
      />
      
      {/* 时间标签 */}
      <div 
        className="absolute left-6 bg-black text-white text-xs px-2 py-1 rounded shadow-lg transform -translate-y-1/2"
        style={{ top: '0' }}
      >
        {format(currentTime, 'HH:mm')}
      </div>
    </div>
  );
};

/**
 * 格式化时间的辅助函数
 */
function format(date: Date, formatStr: string): string {
  const hours = date.getHours().toString().padStart(2, '0');
  const minutes = date.getMinutes().toString().padStart(2, '0');
  
  if (formatStr === 'HH:mm') {
    return `${hours}:${minutes}`;
  }
  
  return `${hours}:${minutes}`;
}

export default TimeIndicator;
