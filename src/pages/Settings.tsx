import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download, Upload, Trash2, Calendar, Clock, MapPin } from 'lucide-react';
import { useAppStore } from '../store';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * 设置页面
 * 提供工作作息配置、数据管理、假期设置等功能
 */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { workSchedule, updateWorkSchedule, exportData, importData, clearAllData } = useAppStore();
  
  const [formData, setFormData] = React.useState({
    workDays: [...workSchedule.workDays],
    workStartTime: workSchedule.workStartTime,
    workEndTime: workSchedule.workEndTime,
    lunchStartTime: workSchedule.lunchStartTime,
    lunchEndTime: workSchedule.lunchEndTime,
    excludedTimeSlots: [...workSchedule.excludedTimeSlots],
    holidays: [...workSchedule.holidays]
  });

  const [holidayInput, setHolidayInput] = React.useState('');
  const [fileInputRef, setFileInputRef] = React.useState<HTMLInputElement | null>(null);

  const handleSave = () => {
    updateWorkSchedule(formData);
    toast.success('设置已保存');
  };

  const handleParseHoliday = () => {
    if (!holidayInput.trim()) return;

    try {
      // 解析类似"一、元旦：1月1日（周四）至3日（周六）放假调休，共3天。1月4日（周日）上班。"的格式
      const lines = holidayInput.split('\n').filter(line => line.trim());
      const newHolidays: typeof formData.holidays = [];

      lines.forEach(line => {
        // 简单的正则表达式提取日期
        const dateMatches = line.match(/(\d+)月(\d+)日/g);
        if (dateMatches && dateMatches.length >= 2) {
          const currentYear = new Date().getFullYear();
          const startDate = dateMatches[0];
          const endDate = dateMatches[1];
          
          // 提取月份和日期
          const startMatch = startDate.match(/(\d+)月(\d+)日/);
          const endMatch = endDate.match(/(\d+)月(\d+)日/);
          
          if (startMatch && endMatch) {
            const startMonth = parseInt(startMatch[1]);
            const startDay = parseInt(startMatch[2]);
            const endMonth = parseInt(endMatch[1]);
            const endDay = parseInt(endMatch[2]);
            
            newHolidays.push({
              name: line.split('：')[0].replace(/^\d+、/, '').trim(),
              startDate: `${currentYear}-${startMonth.toString().padStart(2, '0')}-${startDay.toString().padStart(2, '0')}`,
              endDate: `${currentYear}-${endMonth.toString().padStart(2, '0')}-${endDay.toString().padStart(2, '0')}`,
              isWorkDay: line.includes('上班')
            });
          }
        }
      });

      if (newHolidays.length > 0) {
        setFormData(prev => ({
          ...prev,
          holidays: [...prev.holidays, ...newHolidays]
        }));
        toast.success(`成功解析${newHolidays.length}个假期`);
        setHolidayInput('');
      } else {
        toast.error('未解析到有效的假期信息');
      }
    } catch (error) {
      toast.error('解析失败：' + (error as Error).message);
    }
  };

  const handleExportData = async () => {
    try {
      const data = await exportData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `align-data-${format(new Date(), 'yyyy-MM-dd')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('数据导出成功');
    } catch (error) {
      toast.error('数据导出失败：' + (error as Error).message);
    }
  };

  const handleImportData = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        await importData(data);
        toast.success('数据导入成功');
        // 重新加载页面以应用新数据
        window.location.reload();
      } catch (error) {
        toast.error('数据导入失败：' + (error as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearAllData = () => {
    if (window.confirm('确定要清除所有数据吗？此操作不可恢复。')) {
      clearAllData();
      toast.success('所有数据已清除');
      window.location.reload();
    }
  };

  const addExcludedTimeSlot = () => {
    setFormData(prev => ({
      ...prev,
      excludedTimeSlots: [...prev.excludedTimeSlots, {
        startTime: '12:00',
        endTime: '13:00'
      }]
    }));
  };

  const removeExcludedTimeSlot = (index: number) => {
    setFormData(prev => ({
      ...prev,
      excludedTimeSlots: prev.excludedTimeSlots.filter((_, i) => i !== index)
    }));
  };

  const updateExcludedTimeSlot = (index: number, field: 'startTime' | 'endTime', value: string) => {
    setFormData(prev => ({
      ...prev,
      excludedTimeSlots: prev.excludedTimeSlots.map((slot, i) => 
        i === index ? { ...slot, [field]: value } : slot
      )
    }));
  };

  const weekDays = [
    { value: 0, label: '周日' },
    { value: 1, label: '周一' },
    { value: 2, label: '周二' },
    { value: 3, label: '周三' },
    { value: 4, label: '周四' },
    { value: 5, label: '周五' },
    { value: 6, label: '周六' }
  ];

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
              <span>设置</span>
            </h1>
          </div>
          
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>保存设置</span>
          </button>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* 工作作息设置 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900">
              <Calendar className="w-5 h-5" />
              <span>工作作息设置</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  工作日
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {weekDays.map(day => (
                    <label key={day.value} className="flex items-center space-x-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.workDays.includes(day.value)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({
                              ...prev,
                              workDays: [...prev.workDays, day.value]
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              workDays: prev.workDays.filter(d => d !== day.value)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-black focus:ring-black"
                      />
                      <span className="text-sm text-gray-700">{day.label}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    工作开始时间
                  </label>
                  <input
                    type="time"
                    value={formData.workStartTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, workStartTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    工作结束时间
                  </label>
                  <input
                    type="time"
                    value={formData.workEndTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, workEndTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    午休开始时间
                  </label>
                  <input
                    type="time"
                    value={formData.lunchStartTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, lunchStartTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    午休结束时间
                  </label>
                  <input
                    type="time"
                    value={formData.lunchEndTime}
                    onChange={(e) => setFormData(prev => ({ ...prev, lunchEndTime: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 排除时间段 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900">
              <Clock className="w-5 h-5" />
              <span>排除时间段</span>
            </h2>
            
            <div className="space-y-3">
              {formData.excludedTimeSlots.map((slot, index) => (
                <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                  <input
                    type="time"
                    value={slot.startTime}
                    onChange={(e) => updateExcludedTimeSlot(index, 'startTime', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <span className="text-gray-500">至</span>
                  <input
                    type="time"
                    value={slot.endTime}
                    onChange={(e) => updateExcludedTimeSlot(index, 'endTime', e.target.value)}
                    className="px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                  <button
                    onClick={() => removeExcludedTimeSlot(index)}
                    className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              
              <button
                onClick={addExcludedTimeSlot}
                className="w-full py-2 border-2 border-dashed border-gray-300 text-gray-500 hover:text-gray-700 hover:border-gray-400 rounded-lg transition-colors"
              >
                + 添加排除时间段
              </button>
            </div>
          </div>

          {/* 假期设置 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900">
              <MapPin className="w-5 h-5" />
              <span>假期设置</span>
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  快速解析假期（支持自然语言）
                </label>
                <textarea
                  value={holidayInput}
                  onChange={(e) => setHolidayInput(e.target.value)}
                  placeholder="粘贴假期安排，例如：
一、元旦：1月1日（周四）至3日（周六）放假调休，共3天。1月4日（周日）上班。
二、春节：2月15日（农历腊月二十八、周日）至23日（农历正月初七、周一）放假调休，共9天。"
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent h-32 resize-none text-gray-900"
                />
                <button
                  onClick={handleParseHoliday}
                  disabled={!holidayInput.trim()}
                  className="mt-2 px-4 py-2 bg-black text-white hover:bg-gray-800 disabled:bg-gray-300 disabled:cursor-not-allowed rounded-lg transition-colors"
                >
                  解析假期
                </button>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  已设置假期
                </label>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {formData.holidays.map((holiday, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border border-gray-100">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{holiday.name}</div>
                        <div className="text-xs text-gray-500">
                          {holiday.startDate} 至 {holiday.endDate}
                          {holiday.isWorkDay && ' (调休上班)'}
                        </div>
                      </div>
                      <button
                        onClick={() => setFormData(prev => ({
                          ...prev,
                          holidays: prev.holidays.filter((_, i) => i !== index)
                        }))}
                        className="p-1 text-gray-400 hover:text-black hover:bg-gray-200 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {formData.holidays.length === 0 && (
                    <div className="text-center text-gray-500 py-4">
                      暂无假期设置
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* 数据管理 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900">
              <Download className="w-5 h-5" />
              <span>数据管理</span>
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                  onClick={handleExportData}
                  className="flex items-center justify-center space-x-2 p-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors border border-gray-200"
                >
                  <Download className="w-5 h-5" />
                  <span>导出数据</span>
                </button>
                
                <label className="flex items-center justify-center space-x-2 p-4 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors cursor-pointer border border-gray-200">
                  <Upload className="w-5 h-5" />
                  <span>导入数据</span>
                  <input
                    ref={setFileInputRef}
                    type="file"
                    accept=".json"
                    onChange={handleImportData}
                    className="hidden"
                  />
                </label>
              </div>
              
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <h3 className="font-medium mb-2 text-gray-900">数据说明</h3>
                <ul className="text-sm text-gray-600 space-y-1">
                  <li>• 导出数据包含所有任务、设置和分析数据</li>
                  <li>• 导入数据会覆盖当前所有数据</li>
                  <li>• 建议在导入前备份现有数据</li>
                  <li>• 数据文件为JSON格式，可手动编辑</li>
                </ul>
              </div>
              
              <button
                onClick={handleClearAllData}
                className="w-full flex items-center justify-center space-x-2 p-4 bg-white border border-gray-200 text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Trash2 className="w-5 h-5" />
                <span>清除所有数据</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;