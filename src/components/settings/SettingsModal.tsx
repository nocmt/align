/**
 * 设置模态框组件 - 配置工作作息、健康提醒、数据管理
 * 包含AI配置、工作作息设置、数据导入导出等功能
 */

import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store';
import { AIConfig, WorkSchedule } from '@/types';
import { 
  X, 
  Save, 
  Settings, 
  Clock, 
  Heart, 
  Brain, 
  Download, 
  Upload,
  Trash2,
  Calendar,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

/**
 * 设置模态框属性接口
 */
interface SettingsModalProps {
  onClose: () => void;
}

/**
 * 设置模态框组件
 */
const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { 
    aiConfig, 
    workSchedule, 
    updateAIConfig, 
    updateWorkSchedule, 
    exportData, 
    importData, 
    clearAllData 
  } = useAppStore();

  const [activeTab, setActiveTab] = useState<'ai' | 'schedule' | 'data'>('ai');
  const [isTestingAI, setIsTestingAI] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // AI配置状态
  const [aiEndpoint, setAiEndpoint] = useState(aiConfig.apiEndpoint);
  const [aiKey, setAiKey] = useState(aiConfig.apiKey);
  const [aiModel, setAiModel] = useState(aiConfig.model);
  const [aiFeatures, setAiFeatures] = useState(aiConfig.enabledFeatures);
  const [healthReminders, setHealthReminders] = useState(aiConfig.healthReminders);

  // 工作作息状态
  const [workDays, setWorkDays] = useState<number[]>(workSchedule.workDays);
  const [workStartTime, setWorkStartTime] = useState(workSchedule.workStartTime);
  const [workEndTime, setWorkEndTime] = useState(workSchedule.workEndTime);
  const [lunchStartTime, setLunchStartTime] = useState(workSchedule.lunchStartTime);
  const [lunchEndTime, setLunchEndTime] = useState(workSchedule.lunchEndTime);
  const [excludedTimeSlots, setExcludedTimeSlots] = useState(workSchedule.excludedTimeSlots);
  const [holidays, setHolidays] = useState(workSchedule.holidays);

  // 假期文本输入
  const [holidayText, setHolidayText] = useState('');

  // AI模型选项
  const aiModels = [
    'Qwen/Qwen2.5-7B-Instruct',
    'Qwen/Qwen2.5-14B-Instruct',
    'deepseek-ai/DeepSeek-V2.5',
    'THUDM/glm-4-9b-chat',
    '01-ai/Yi-1.5-9B-Chat-16K'
  ];

  // 星期选项
  const weekDaysOptions = [
    { value: 0, label: '周日', short: '日' },
    { value: 1, label: '周一', short: '一' },
    { value: 2, label: '周二', short: '二' },
    { value: 3, label: '周三', short: '三' },
    { value: 4, label: '周四', short: '四' },
    { value: 5, label: '周五', short: '五' },
    { value: 6, label: '周六', short: '六' }
  ];

  /**
   * 测试AI连接
   */
  const testAIConnection = async () => {
    if (!aiEndpoint || !aiKey) {
      toast.error('请先填写API端点和密钥');
      return;
    }

    setIsTestingAI(true);
    try {
      const response = await fetch(aiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${aiKey}`
        },
        body: JSON.stringify({
          model: aiModel,
          messages: [{ role: 'user', content: 'Hello' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        toast.success('AI连接测试成功！');
      } else {
        toast.error(`AI连接失败: ${response.status}`);
      }
    } catch (error) {
      toast.error('AI连接测试失败，请检查网络连接');
    } finally {
      setIsTestingAI(false);
    }
  };

  /**
   * 保存AI配置
   */
  const saveAIConfig = async () => {
    try {
      const newConfig: Partial<AIConfig> = {
        apiEndpoint: aiEndpoint,
        apiKey: aiKey,
        model: aiModel,
        enabledFeatures: aiFeatures,
        healthReminders: healthReminders
      };

      await updateAIConfig(newConfig);
      toast.success('AI配置保存成功！');
    } catch (error) {
      toast.error('AI配置保存失败');
    }
  };

  /**
   * 保存工作作息配置
   */
  const saveWorkSchedule = async () => {
    try {
      const newSchedule: Partial<WorkSchedule> = {
        workDays,
        workStartTime,
        workEndTime,
        lunchStartTime,
        lunchEndTime,
        excludedTimeSlots,
        holidays
      };

      await updateWorkSchedule(newSchedule);
      toast.success('工作作息配置保存成功！');
    } catch (error) {
      toast.error('工作作息配置保存失败');
    }
  };

  /**
   * 解析假期文本
   */
  const parseHolidayText = () => {
    if (!holidayText.trim()) return;

    try {
      // 简单的假期解析逻辑
      const lines = holidayText.split('\n').filter(line => line.trim());
      const parsedHolidays = [];

      for (const line of lines) {
        // 匹配类似 "元旦：1月1日（周四）至3日（周六）放假调休，共3天。1月4日（周日）上班。" 的格式
        const match = line.match(/(.+?)：(\d+)月(\d+)日.*?至(\d+)月(\d+)日.*?共(\d+)天/);
        if (match) {
          const [, name, startMonth, startDay, endMonth, endDay, days] = match;
          const currentYear = new Date().getFullYear();
          
          parsedHolidays.push({
            name: name.trim(),
            startDate: `${currentYear}-${startMonth.padStart(2, '0')}-${startDay.padStart(2, '0')}`,
            endDate: `${currentYear}-${endMonth.padStart(2, '0')}-${endDay.padStart(2, '0')}`,
            isWorkDay: false
          });
        }
      }

      setHolidays([...holidays, ...parsedHolidays]);
      setHolidayText('');
      toast.success(`成功解析 ${parsedHolidays.length} 个假期`);
    } catch (error) {
      toast.error('假期解析失败，请检查格式');
    }
  };

  /**
   * 添加排除时间段
   */
  const addExcludedTimeSlot = () => {
    setExcludedTimeSlots([...excludedTimeSlots, {
      startTime: '12:00',
      endTime: '13:00'
    }]);
  };

  /**
   * 删除排除时间段
   */
  const removeExcludedTimeSlot = (index: number) => {
    setExcludedTimeSlots(excludedTimeSlots.filter((_, i) => i !== index));
  };

  /**
   * 处理数据导入
   */
  const handleImportData = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await importData(data);
      toast.success('数据导入成功！');
    } catch (error) {
      toast.error('数据导入失败，请检查文件格式');
    } finally {
      // 重置文件输入
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  /**
   * 处理数据清除
   */
  const handleClearData = async () => {
    if (confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      try {
        await clearAllData();
        toast.success('数据清除成功！');
      } catch (error) {
        toast.error('数据清除失败');
      }
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-screen overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <Settings className="w-6 h-6 text-gray-700" />
            <h2 className="text-xl font-semibold text-gray-900">设置</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* 标签页导航 */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'ai'
                ? 'text-black border-b-2 border-black bg-gray-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Brain className="w-4 h-4" />
            AI配置
          </button>
          <button
            onClick={() => setActiveTab('schedule')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'schedule'
                ? 'text-black border-b-2 border-black bg-gray-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <Clock className="w-4 h-4" />
            工作作息
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`flex items-center gap-2 px-6 py-3 font-medium transition-colors ${
              activeTab === 'data'
                ? 'text-black border-b-2 border-black bg-gray-50'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            <RefreshCw className="w-4 h-4" />
            数据管理
          </button>
        </div>

        {/* 内容区域 */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* AI配置 */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* API配置 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Brain className="w-5 h-5" />
                  API配置
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API端点
                    </label>
                    <input
                      type="text"
                      value={aiEndpoint}
                      onChange={(e) => setAiEndpoint(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="https://api.siliconflow.cn/v1/chat/completions"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      API密钥
                    </label>
                    <input
                      type="password"
                      value={aiKey}
                      onChange={(e) => setAiKey(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                      placeholder="输入您的API密钥"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      模型选择
                    </label>
                    <select
                      value={aiModel}
                      onChange={(e) => setAiModel(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    >
                      {aiModels.map((model) => (
                        <option key={model} value={model}>
                          {model}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={testAIConnection}
                      disabled={isTestingAI || !aiEndpoint || !aiKey}
                      className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                    >
                      {isTestingAI ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <CheckCircle className="w-4 h-4" />
                      )}
                      {isTestingAI ? '测试中...' : '测试连接'}
                    </button>
                    <button
                      onClick={saveAIConfig}
                      className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      保存配置
                    </button>
                  </div>
                </div>
              </div>

              {/* AI功能开关 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">AI功能开关</h3>
                <div className="space-y-3">
                  {Object.entries(aiFeatures).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between">
                      <div>
                        <div className="font-medium text-gray-900">
                          {getFeatureLabel(key)}
                        </div>
                        <div className="text-sm text-gray-600">
                          {getFeatureDescription(key)}
                        </div>
                      </div>
                      <button
                        onClick={() => setAiFeatures({ ...aiFeatures, [key]: !value })}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                          value ? 'bg-black' : 'bg-gray-200'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            value ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* 健康提醒 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5" />
                  健康提醒
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">喝水提醒</div>
                      <div className="text-sm text-gray-600">每{healthReminders.waterInterval}分钟提醒一次</div>
                    </div>
                    <button
                      onClick={() => setHealthReminders({ ...healthReminders, waterReminder: !healthReminders.waterReminder })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        healthReminders.waterReminder ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          healthReminders.waterReminder ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">站立提醒</div>
                      <div className="text-sm text-gray-600">每{healthReminders.standInterval}分钟提醒一次</div>
                    </div>
                    <button
                      onClick={() => setHealthReminders({ ...healthReminders, standReminder: !healthReminders.standReminder })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        healthReminders.standReminder ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          healthReminders.standReminder ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-gray-900">眼睛休息提醒</div>
                      <div className="text-sm text-gray-600">每{healthReminders.eyeRestInterval}分钟提醒一次</div>
                    </div>
                    <button
                      onClick={() => setHealthReminders({ ...healthReminders, eyeRestReminder: !healthReminders.eyeRestReminder })}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                        healthReminders.eyeRestReminder ? 'bg-black' : 'bg-gray-200'
                      }`}
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          healthReminders.eyeRestReminder ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 工作作息 */}
          {activeTab === 'schedule' && (
            <div className="space-y-6">
              {/* 工作日设置 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">工作日设置</h3>
                <div className="grid grid-cols-7 gap-2">
                  {weekDaysOptions.map((day) => (
                    <button
                      key={day.value}
                      onClick={() => {
                        if (workDays.includes(day.value)) {
                          setWorkDays(workDays.filter(d => d !== day.value));
                        } else {
                          setWorkDays([...workDays, day.value].sort());
                        }
                      }}
                      className={`p-3 rounded-lg border transition-colors ${
                        workDays.includes(day.value)
                          ? 'bg-black border-black text-white'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      <div className="font-medium">{day.short}</div>
                      <div className={`text-xs ${workDays.includes(day.value) ? 'opacity-90' : 'opacity-75'}`}>{day.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* 工作时间设置 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">工作时间</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始时间
                    </label>
                    <input
                      type="time"
                      value={workStartTime}
                      onChange={(e) => setWorkStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结束时间
                    </label>
                    <input
                      type="time"
                      value={workEndTime}
                      onChange={(e) => setWorkEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 午休时间设置 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">午休时间</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      开始时间
                    </label>
                    <input
                      type="time"
                      value={lunchStartTime}
                      onChange={(e) => setLunchStartTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      结束时间
                    </label>
                    <input
                      type="time"
                      value={lunchEndTime}
                      onChange={(e) => setLunchEndTime(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* 排除时间段 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center justify-between">
                  <span>排除时间段</span>
                  <button
                    onClick={addExcludedTimeSlot}
                    className="bg-black text-white px-3 py-1 rounded-md hover:bg-gray-800 text-sm"
                  >
                    添加
                  </button>
                </h3>
                <div className="space-y-3">
                  {excludedTimeSlots.map((slot, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-white rounded-lg border">
                      <input
                        type="time"
                        value={slot.startTime}
                        onChange={(e) => {
                          const updated = [...excludedTimeSlots];
                          updated[index].startTime = e.target.value;
                          setExcludedTimeSlots(updated);
                        }}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-black"
                      />
                      <span className="text-gray-500">至</span>
                      <input
                        type="time"
                        value={slot.endTime}
                        onChange={(e) => {
                          const updated = [...excludedTimeSlots];
                          updated[index].endTime = e.target.value;
                          setExcludedTimeSlots(updated);
                        }}
                        className="px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-black"
                      />
                      <button
                        onClick={() => removeExcludedTimeSlot(index)}
                        className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {excludedTimeSlots.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      暂无排除时间段
                    </div>
                  )}
                </div>
              </div>

              {/* 假期设置 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4">假期设置</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      粘贴假期安排文本
                    </label>
                    <textarea
                      value={holidayText}
                      onChange={(e) => setHolidayText(e.target.value)}
                      placeholder="例如：元旦：1月1日（周四）至3日（周六）放假调休，共3天。1月4日（周日）上班。"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-black focus:border-transparent"
                      rows={4}
                    />
                    <button
                      onClick={parseHolidayText}
                      disabled={!holidayText.trim()}
                      className="mt-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      解析假期
                    </button>
                  </div>

                  {holidays.length > 0 && (
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">已解析的假期</h4>
                      <div className="space-y-2 max-h-32 overflow-y-auto">
                        {holidays.map((holiday, index) => (
                          <div key={index} className="flex items-center justify-between p-2 bg-white rounded border">
                            <div>
                              <div className="font-medium text-sm">{holiday.name}</div>
                              <div className="text-xs text-gray-600">
                                {holiday.startDate} 至 {holiday.endDate}
                              </div>
                            </div>
                            <button
                              onClick={() => setHolidays(holidays.filter((_, i) => i !== index))}
                              className="p-1 text-gray-400 hover:text-black hover:bg-gray-100 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={saveWorkSchedule}
                className="bg-black text-white px-6 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
              >
                <Save className="w-4 h-4" />
                保存工作作息配置
              </button>
            </div>
          )}

          {/* 数据管理 */}
          {activeTab === 'data' && (
            <div className="space-y-6">
              {/* 数据导出 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Download className="w-5 h-5" />
                  数据导出
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  导出所有任务、配置和分析数据到JSON文件，用于备份或迁移。
                </p>
                <button
                  onClick={exportData}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  导出数据
                </button>
              </div>

              {/* 数据导入 */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <Upload className="w-5 h-5" />
                  数据导入
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  从JSON文件导入数据，将覆盖现有数据。请确保文件格式正确。
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImportData}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 flex items-center gap-2"
                >
                  <Upload className="w-4 h-4" />
                  选择文件导入
                </button>
              </div>

              {/* 数据清除 */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  危险操作
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  清除所有数据将删除所有任务、配置和分析数据，此操作不可恢复。
                </p>
                <button
                  onClick={handleClearData}
                  className="flex items-center space-x-2 px-4 py-2 bg-white text-gray-900 border border-gray-200 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>清除所有数据</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/**
 * 获取功能标签
 */
function getFeatureLabel(key: string): string {
  const labels = {
    naturalLanguageParse: '自然语言解析',
    timeEstimation: '智能时间预估',
    autoSchedule: '自动排程',
    dailySuggestion: '每日建议',
    progressAnalysis: '进度分析'
  };
  return labels[key as keyof typeof labels] || key;
}

/**
 * 获取功能描述
 */
function getFeatureDescription(key: string): string {
  const descriptions = {
    naturalLanguageParse: '解析自然语言输入，自动填充任务信息',
    timeEstimation: '基于历史数据智能预估任务所需时间',
    autoSchedule: '根据优先级和工作时间自动安排任务',
    dailySuggestion: '基于任务和历史数据生成每日工作建议',
    progressAnalysis: '分析任务完成情况和效率趋势'
  };
  return descriptions[key as keyof typeof descriptions] || key;
}

export default SettingsModal;