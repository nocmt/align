/**
 * 列表视图组件
 * 以列表形式展示任务，按日期分组
 */

import React, { useMemo } from 'react';
import { useAppStore } from '@/store';
import { Task } from '@/types';
import { format, isToday, isTomorrow, isYesterday, compareAsc } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { 
  CheckCircle, 
  Circle, 
  Clock, 
  Calendar,
  AlertCircle,
  MoreHorizontal
} from 'lucide-react';
import { clsx } from 'clsx';

const ListView: React.FC = () => {
  const { tasks, selectedCategory, updateTask, openModal } = useAppStore();

  // 过滤任务
  const filteredTasks = useMemo(() => {
    let result = tasks;
    if (selectedCategory !== 'all') {
      result = result.filter(task => task.category === selectedCategory);
    }
    // 过滤掉已完成的任务（可选，或者放到底部）
    // 这里我们显示所有任务，但按状态排序
    return result.sort((a, b) => {
      // 未完成在前，已完成在后
      if (a.status === 'completed' && b.status !== 'completed') return 1;
      if (a.status !== 'completed' && b.status === 'completed') return -1;
      // 按时间排序
      return compareAsc(new Date(a.startTime), new Date(b.startTime));
    });
  }, [tasks, selectedCategory]);

  // 按日期分组
  const groupedTasks = useMemo(() => {
    const groups: { [key: string]: Task[] } = {};
    
    filteredTasks.forEach(task => {
      const date = new Date(task.startTime);
      const dateKey = format(date, 'yyyy-MM-dd');
      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(task);
    });

    // 排序日期键
    return Object.keys(groups).sort().reduce((acc, key) => {
      acc[key] = groups[key];
      return acc;
    }, {} as { [key: string]: Task[] });
  }, [filteredTasks]);

  // 获取日期标题
  const getDateLabel = (dateStr: string) => {
    const date = new Date(dateStr);
    if (isToday(date)) return '今天';
    if (isTomorrow(date)) return '明天';
    if (isYesterday(date)) return '昨天';
    return format(date, 'M月d日 EEE', { locale: zhCN });
  };

  // 处理任务完成状态
  const toggleTaskStatus = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    const newStatus = task.status === 'completed' ? 'planning' : 'completed';
    await updateTask(task.id, { 
      status: newStatus,
      completedAt: newStatus === 'completed' ? new Date() : undefined
    });
  };

  return (
    <div className="flex-1 h-full bg-white overflow-y-auto custom-scrollbar p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {Object.entries(groupedTasks).map(([dateStr, tasks]) => (
          <div key={dateStr}>
            <h3 className="text-sm font-medium text-gray-500 mb-3 sticky top-0 bg-white py-2 z-10 flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              {getDateLabel(dateStr)}
              <span className="text-xs font-normal text-gray-400">
                ({tasks.length})
              </span>
            </h3>
            <div className="space-y-2">
              {tasks.map(task => (
                <div
                  key={task.id}
                  onClick={() => openModal('task', task)}
                  className={clsx(
                    "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                    task.status === 'completed' 
                      ? "bg-gray-50 border-gray-100" 
                      : "bg-white border-gray-200 hover:border-black/10"
                  )}
                >
                  {/* 状态复选框 */}
                  <button
                    onClick={(e) => toggleTaskStatus(e, task)}
                    className={clsx(
                      "flex-shrink-0 transition-colors",
                      task.status === 'completed' ? "text-gray-400" : "text-gray-300 group-hover:text-black"
                    )}
                  >
                    {task.status === 'completed' ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  {/* 任务内容 */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={clsx(
                        "text-sm font-medium truncate transition-colors",
                        task.status === 'completed' ? "text-gray-500 line-through" : "text-gray-900"
                      )}>
                        {task.title}
                      </span>
                      {task.priority === 'urgent-important' && (
                        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-red-500" title="重要且紧急" />
                      )}
                    </div>
                    
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        <span>
                          {format(new Date(task.startTime), 'HH:mm')} - {format(new Date(task.endTime), 'HH:mm')}
                        </span>
                      </div>
                      {task.description && (
                        <div className="truncate max-w-[200px]">
                          {task.description}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 右侧标签 */}
                  <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <span className="px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-600">
                      {task.category}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
        
        {filteredTasks.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-gray-400">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mb-4">
              <Calendar className="w-8 h-8 text-gray-300" />
            </div>
            <p>没有任务</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ListView;
