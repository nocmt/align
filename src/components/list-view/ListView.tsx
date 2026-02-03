/**
 * 列表视图组件
 * 以列表形式展示任务，按日期分组
 */

import React, { useMemo, useState } from 'react';
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
  MoreHorizontal,
  Square,
  CheckSquare,
  Trash2,
  X
} from 'lucide-react';
import { clsx } from 'clsx';
import { toast } from 'sonner';

const ListView: React.FC = () => {
  const { 
    tasks, 
    selectedCategory, 
    updateTask, 
    deleteTask, 
    openModal, 
    batchDeleteTasks, 
    batchUpdateTaskStatus 
  } = useAppStore();

  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
  const [isSelectionMode, setIsSelectionMode] = useState(false);

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

  // 监听键盘事件 (Cmd+A)
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'a') {
        e.preventDefault();
        setIsSelectionMode(true);
        setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  // 处理选择
  const toggleSelection = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    const newSelected = new Set(selectedTaskIds);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTaskIds(newSelected);
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  // 批量删除
  const handleBatchDelete = async () => {
    if (selectedTaskIds.size === 0) return;
    
    if (confirm(`确定要删除选中的 ${selectedTaskIds.size} 个任务吗？`)) {
      try {
        await batchDeleteTasks(Array.from(selectedTaskIds));
        setSelectedTaskIds(new Set());
        toast.success(`已删除 ${selectedTaskIds.size} 个任务`);
      } catch (error) {
        toast.error('批量删除失败');
      }
    }
  };

  // 批量修改状态
  const handleBatchStatus = async (status: Task['status']) => {
    if (selectedTaskIds.size === 0) return;
    
    try {
      await batchUpdateTaskStatus(Array.from(selectedTaskIds), status);
      setSelectedTaskIds(new Set());
      toast.success(`已更新 ${selectedTaskIds.size} 个任务状态`);
    } catch (error) {
      toast.error('批量更新状态失败');
    }
  };

  // 单个删除
  const handleDelete = async (e: React.MouseEvent, task: Task) => {
    e.stopPropagation();
    if (confirm('确定要删除这个任务吗？')) {
      try {
        await deleteTask(task.id);
        toast.success('任务已删除');
      } catch (error) {
        toast.error('删除失败');
      }
    }
  };

  return (
    <div className="flex-1 h-full bg-white overflow-y-auto custom-scrollbar relative">
      {/* 顶部操作栏 */}
      <div className="sticky top-0 left-0 right-0 z-20 bg-white border-b border-gray-200 px-6 py-3 min-h-[60px] flex items-center justify-between shadow-sm">
        {isSelectionMode ? (
          // 批量操作模式
          <>
            <div className="flex items-center gap-4 animate-in fade-in duration-200">
              <button
                onClick={toggleSelectAll}
                className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
              >
                <CheckSquare className="w-5 h-5 text-blue-600" />
                <span>已选择 {selectedTaskIds.size} 项</span>
              </button>
              <div className="h-4 w-px bg-gray-300" />
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedTaskIds(new Set());
                }}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                取消选择
              </button>
            </div>
            <div className="flex items-center gap-2 animate-in fade-in duration-200">
              <button
                onClick={() => handleBatchStatus('completed')}
                className="px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md transition-colors flex items-center gap-1.5"
              >
                <CheckCircle className="w-4 h-4" />
                标记完成
              </button>
              <button
                onClick={() => handleBatchStatus('planning')}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Circle className="w-4 h-4" />
                标记未完成
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-md transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-4 h-4" />
                删除
              </button>
            </div>
          </>
        ) : (
          // 普通模式
          <div className="flex items-center gap-4 animate-in fade-in duration-200">
            <button
              onClick={() => setIsSelectionMode(true)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 px-2 py-1.5 rounded-md hover:bg-gray-100 transition-colors"
            >
              <CheckSquare className="w-5 h-5" />
              <span>多选</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-6">
        <div className="max-w-4xl mx-auto space-y-8">
          {Object.entries(groupedTasks).map(([dateStr, tasks]) => (
            <div key={dateStr}>
              <h3 className="text-sm font-medium text-gray-500 mb-3 sticky top-[60px] bg-white py-2 z-10 flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                {getDateLabel(dateStr)}
                <span className="text-xs font-normal text-gray-400">
                  ({tasks.length})
                </span>
              </h3>
              <div className="space-y-2">
                {tasks.map(task => {
                  const isSelected = selectedTaskIds.has(task.id);
                  return (
                    <div
                      key={task.id}
                      onClick={() => {
                        // 如果在选择模式下，点击卡片也是选择
                        if (isSelectionMode) {
                          toggleSelection({ stopPropagation: () => {} } as React.MouseEvent, task.id);
                        } else {
                          openModal('task', task);
                        }
                      }}
                      className={clsx(
                        "group flex items-center gap-4 p-4 rounded-xl border transition-all cursor-pointer hover:shadow-md",
                        isSelected 
                          ? "bg-blue-50 border-blue-200"
                          : task.status === 'completed' 
                            ? "bg-gray-50 border-gray-100" 
                            : "bg-white border-gray-200 hover:border-black/10"
                      )}
                    >
                      {/* 多选复选框 */}
                      {isSelectionMode && (
                        <div className="flex-shrink-0 animate-in fade-in zoom-in duration-200">
                          <button
                            onClick={(e) => toggleSelection(e, task.id)}
                            className={clsx(
                              "transition-colors",
                              isSelected ? "text-blue-600" : "text-gray-300 hover:text-gray-500"
                            )}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-5 h-5" />
                            ) : (
                              <Square className="w-5 h-5" />
                            )}
                          </button>
                        </div>
                      )}

                      {/* 状态圆圈 */}
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

                      {/* 右侧标签和操作 */}
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-1 rounded-md bg-gray-100 text-xs text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity">
                          {task.category}
                        </span>
                        
                        {/* 删除按钮 */}
                        <button
                          onClick={(e) => handleDelete(e, task)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                          title="删除任务"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
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
    </div>
  );
};

export default ListView;