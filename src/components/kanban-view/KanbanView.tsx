/**
 * 看板视图组件
 * 以看板形式展示任务，支持拖拽改变状态
 */

import React, { useMemo } from 'react';
import { useAppStore } from '@/store';
import { Task, TaskStatus } from '@/types';
import { useDrop } from 'react-dnd';
import TaskCard from '../week-view/TaskCard';
import { Plus } from 'lucide-react';

interface ColumnProps {
  title: string;
  status: TaskStatus | 'planning';
  tasks: Task[];
  onDrop: (taskId: string, status: TaskStatus | 'planning') => void;
  onAddTask: (status: TaskStatus | 'planning') => void;
}

const KanbanColumn: React.FC<ColumnProps> = ({ title, status, tasks, onDrop, onAddTask }) => {
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
          />
        ))}
      </div>
    </div>
  );
};

const KanbanView: React.FC = () => {
  const { tasks, selectedCategory, updateTask, openModal } = useAppStore();

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

  return (
    <div className="flex-1 h-full overflow-x-auto overflow-y-hidden bg-white p-6">
      <div className="flex h-full gap-6 min-w-max">
        {columns.map(col => (
          <KanbanColumn
            key={col.status}
            title={col.title}
            status={col.status as any}
            tasks={col.tasks}
            onDrop={handleDrop}
            onAddTask={handleAddTask}
          />
        ))}
      </div>
    </div>
  );
};

export default KanbanView;
