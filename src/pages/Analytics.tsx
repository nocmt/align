import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, TrendingUp, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { format, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns';
import { zhCN } from 'date-fns/locale';

/**
 * 数据分析页面
 * 提供完成率统计、时间对比分析、优先级分布等数据可视化
 */
const Analytics: React.FC = () => {
  const navigate = useNavigate();
  const { tasks, analyticsData } = useAppStore();

  // 计算统计数据
  const totalTasks = tasks.length;
  const completedTasks = tasks.filter(t => t.status === 'completed').length;
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // 本周数据
  const currentWeek = new Date();
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: 1 });
  const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const weekData = weekDays.map(day => {
    const dayTasks = tasks.filter(task => {
      const taskDate = new Date(task.startTime);
      return format(taskDate, 'yyyy-MM-dd') === format(day, 'yyyy-MM-dd');
    });
    
    const completed = dayTasks.filter(t => t.status === 'completed').length;
    const total = dayTasks.length;
    
    return {
      day: format(day, 'MM/dd', { locale: zhCN }),
      completed,
      total,
      rate: total > 0 ? Math.round((completed / total) * 100) : 0
    };
  });

  // 优先级分布数据
  const priorityData = [
    { 
      name: '紧急+重要', 
      value: tasks.filter(t => t.priority === 'urgent-important').length,
      color: '#ef4444'
    },
    { 
      name: '紧急+不重要', 
      value: tasks.filter(t => t.priority === 'urgent-unimportant').length,
      color: '#f97316'
    },
    { 
      name: '重要+不紧急', 
      value: tasks.filter(t => t.priority === 'important-not-urgent').length,
      color: '#3b82f6'
    },
    { 
      name: '不重要+不紧急', 
      value: tasks.filter(t => t.priority === 'not-important-not-urgent').length,
      color: '#6b7280'
    }
  ];

  // 类别分布数据
  const categoryData = [
    { category: '工作', count: tasks.filter(t => t.category === 'work').length },
    { category: '学习', count: tasks.filter(t => t.category === 'study').length },
    { category: '健康', count: tasks.filter(t => t.category === 'health').length },
    { category: '生活', count: tasks.filter(t => t.category === 'life').length },
    { category: '其他', count: tasks.filter(t => t.category === 'other').length }
  ];

  // 预估vs实际时间对比
  const timeComparisonData = tasks
    .filter(t => t.status === 'completed' && t.actualDuration && t.estimatedDuration)
    .map(task => ({
      name: task.title.length > 20 ? task.title.substring(0, 20) + '...' : task.title,
      estimated: task.estimatedDuration,
      actual: task.actualDuration,
      difference: (task.actualDuration || 0) - task.estimatedDuration
    }))
    .slice(0, 10); // 只显示前10个任务

  // 计算平均时间准确率
  const accuracyRate = timeComparisonData.length > 0
    ? Math.round(
        timeComparisonData.reduce((acc, task) => {
          const accuracy = 1 - Math.abs(task.difference) / task.estimated;
          return acc + Math.max(0, accuracy);
        }, 0) / timeComparisonData.length * 100
      )
    : 0;

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* 页面头部 */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="text-xl font-semibold flex items-center space-x-2 text-gray-900">
              <TrendingUp className="w-6 h-6" />
              <span>数据分析</span>
            </h1>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* 概览卡片 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{completionRate}%</div>
                  <div className="text-sm text-gray-500">总体完成率</div>
                </div>
                <CheckCircle className="w-8 h-8 text-black" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{totalTasks}</div>
                  <div className="text-sm text-gray-500">总任务数</div>
                </div>
                <TrendingUp className="w-8 h-8 text-black" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{completedTasks}</div>
                  <div className="text-sm text-gray-500">已完成</div>
                </div>
                <CheckCircle className="w-8 h-8 text-black" />
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-2xl font-bold text-gray-900">{accuracyRate}%</div>
                  <div className="text-sm text-gray-500">时间预估准确率</div>
                </div>
                <Clock className="w-8 h-8 text-black" />
              </div>
            </div>
          </div>

          {/* 本周完成趋势 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">本周完成趋势</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="day" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#ffffff', 
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    color: '#000000'
                  }}
                  itemStyle={{ color: '#000000' }}
                />
                <Bar dataKey="completed" fill="#000000" name="已完成" />
                <Bar dataKey="total" fill="#9ca3af" name="总数" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* 优先级分布 */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">优先级分布</h2>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={priorityData}
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {priorityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#000000'
                    }}
                    itemStyle={{ color: '#000000' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* 任务类别分布 */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">任务类别分布</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={categoryData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis type="number" stroke="#6b7280" />
                  <YAxis dataKey="category" type="category" stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#000000'
                    }}
                    itemStyle={{ color: '#000000' }}
                  />
                  <Bar dataKey="count" fill="#000000" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* 时间预估准确性 */}
          {timeComparisonData.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">时间预估 vs 实际用时</h2>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={timeComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis dataKey="name" stroke="#6b7280" />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#000000'
                    }}
                    itemStyle={{ color: '#000000' }}
                  />
                  <Bar dataKey="estimated" fill="#9ca3af" name="预估时间" />
                  <Bar dataKey="actual" fill="#000000" name="实际时间" />
                </BarChart>
              </ResponsiveContainer>
              
              <div className="mt-4 text-sm text-gray-500">
                <p>• 黑色条表示实际用时，灰色条表示预估时间</p>
                <p>• 准确率：{accuracyRate}%（基于{timeComparisonData.length}个已完成任务）</p>
              </div>
            </div>
          )}

          {/* 历史趋势 */}
          {analyticsData.length > 0 && (
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h2 className="text-lg font-semibold mb-4 text-gray-900">历史完成趋势</h2>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={analyticsData.slice(-30)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                  <XAxis 
                    dataKey="date" 
                    stroke="#6b7280"
                    tickFormatter={(value) => format(new Date(value), 'MM/dd')}
                  />
                  <YAxis stroke="#6b7280" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#ffffff', 
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      color: '#000000'
                    }}
                    labelFormatter={(value) => format(new Date(value), 'yyyy年MM月dd日')}
                    itemStyle={{ color: '#000000' }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="completionRate" 
                    stroke="#000000" 
                    strokeWidth={2}
                    name="完成率(%)"
                  />
                  <Line 
                    type="monotone" 
                    dataKey="accuracyRate" 
                    stroke="#9ca3af" 
                    strokeWidth={2}
                    name="准确率(%)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* 数据洞察 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 text-gray-900">数据洞察</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-medium mb-2 text-gray-900">效率建议</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  {accuracyRate < 70 && (
                    <li>• 时间预估准确率较低，建议重新评估任务复杂度</li>
                  )}
                  {completionRate < 50 && (
                    <li>• 完成率偏低，建议减少每日任务数量或调整优先级</li>
                  )}
                  {tasks.filter(t => t.priority === 'urgent-important').length > tasks.length * 0.3 && (
                    <li>• 紧急重要任务过多，建议提前规划避免被动</li>
                  )}
                  {accuracyRate >= 70 && completionRate >= 50 && (
                    <li>• 整体表现良好，继续保持当前节奏</li>
                  )}
                </ul>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-100">
                <h3 className="font-medium mb-2 text-gray-900">趋势分析</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 总任务数：{totalTasks}个</li>
                  <li>• 已完成：{completedTasks}个</li>
                  <li>• 平均完成率：{completionRate}%</li>
                  <li>• 时间预估准确率：{accuracyRate}%</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Analytics;