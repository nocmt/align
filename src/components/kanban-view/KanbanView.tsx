/**
 * 看板视图组件
 * 以看板形式展示任务，支持拖拽改变状态
 */

import React, { useMemo, useState, useEffect } from 'react';
import { useAppStore } from '@/store';
import { Task, TaskStatus } from '@/types';
import { useDrop } from 'react-dnd';
import TaskCard from '../week-view/TaskCard';
import { Plus, CheckSquare, CheckCircle, Circle, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

interface ColumnProps {
  title: string;
  status: TaskStatus | 'planning';
  tasks: Task[];
  onDrop: (taskId: string, status: TaskStatus | 'planning') => void;
  onAddTask: (status: TaskStatus | 'planning') => void;
  selectedTaskIds: Set<string>;
  isSelectionMode: boolean;
  onTaskClick: (task: Task, e: React.MouseEvent) => void;
}

const KanbanColumn: React.FC<ColumnProps> = ({ 
  title, 
  status, 
  tasks, 
  onDrop, 
  onAddTask,
  selectedTaskIds,
  isSelectionMode,
  onTaskClick
}) => {
  const [{ isOver }, drop] = useDrop({
    accept: 'TASK',
    drop: (item: { id: string }) => onDrop(item.id, status),
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  return (
    <div 
      ref={drop}
      className={`flex-1 min-w-[300px] bg-gray-50 rounded-xl p-4 flex flex-col h-full border border-transparent transition-colors ${
        isOver ? 'bg-gray-100 border-gray-200' : ''
      }`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-medium text-gray-900 flex items-center gap-2">
          {title}
          <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
            {tasks.length}
          </span>
        </h3>
        <button 
          onClick={() => onAddTask(status)}
          className="p-1 hover:bg-gray-200 rounded-md text-gray-500 transition-colors"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3">
        {tasks.map(task => (
          <TaskCard
            key={task.id}
            task={task}
            style={{ position: 'relative', marginBottom: '8px' }}
            isSelected={selectedTaskIds.has(task.id)}
            isSelectionMode={isSelectionMode}
            onToggleSelect={(e) => onTaskClick(task, e)}
          />
        ))}
      </div>
    </div>
  );
};

const KanbanView: React.FC = () => {
  const { 
    tasks, 
    selectedCategory, 
    updateTask, 
    openModal,
    batchDeleteTasks,
    batchUpdateTaskStatus
  } = useAppStore();

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

  const filteredTasks = useMemo(() => {
    if (selectedCategory === 'all') return tasks;
    return tasks.filter(task => task.category === selectedCategory);
  }, [tasks, selectedCategory]);

  const handleDrop = async (taskId: string, newStatus: TaskStatus | 'planning') => {
    await updateTask(taskId, { 
      status: newStatus as TaskStatus,
      completedAt: newStatus === 'completed' ? new Date() : undefined
    });
  };

  const handleAddTask = (status: TaskStatus | 'planning') => {
    openModal('create_task', { status });
  };

  // 分组任务
  const columns = useMemo(() => {
    const todoTasks = filteredTasks.filter(t => 
      t.status === 'planning' || t.status === 'not-started'
    );
    const inProgressTasks = filteredTasks.filter(t => 
      t.status === 'in-progress' || t.status === 'paused'
    );
    const completedTasks = filteredTasks.filter(t => 
      t.status === 'completed'
    );

    return [
      { title: '未开始', status: 'not-started', tasks: todoTasks },
      { title: '进行中', status: 'in-progress', tasks: inProgressTasks },
      { title: '已完成', status: 'completed', tasks: completedTasks }
    ];
  }, [filteredTasks]);

  // 处理任务点击
  const handleTaskClick = (task: Task, e: React.MouseEvent) => {
    if (isSelectionMode) {
      const newSelected = new Set(selectedTaskIds);
      if (newSelected.has(task.id)) {
        newSelected.delete(task.id);
      } else {
        newSelected.add(task.id);
      }
      setSelectedTaskIds(newSelected);
    } else {
      openModal('task', task);
    }
  };

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedTaskIds.size === filteredTasks.length) {
      setSelectedTaskIds(new Set());
    } else {
      setSelectedTaskIds(new Set(filteredTasks.map(t => t.id)));
    }
  };

  // 监听键盘事件 (Cmd+A)
  useEffect(() => {
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

  return (
    <div 
      className="flex-1 h-full overflow-hidden bg-white relative flex flex-col"
    >
      {/* 顶部操作栏 */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-10">
        {isSelectionMode ? (
          <>
            <div className="flex items-center gap-4">
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
            <div className="flex items-center gap-2">
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
          <div className="flex items-center gap-2">
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

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        <div className="flex h-full gap-6 min-w-max" onClick={(e) => e.stopPropagation()}>
          {columns.map(col => (
            <KanbanColumn
              key={col.status}
              title={col.title}
              status={col.status as any}
              tasks={col.tasks}
              onDrop={handleDrop}
              onAddTask={handleAddTask}
              selectedTaskIds={selectedTaskIds}
              isSelectionMode={isSelectionMode}
              onTaskClick={handleTaskClick}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default KanbanView;
