import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, TestTube } from 'lucide-react';
import { useAppStore } from '../store';
import { toast } from 'sonner';

/**
 * AI配置页面
 * 提供API配置、功能开关、连接测试等功能
 */
const AIConfig: React.FC = () => {
  const navigate = useNavigate();
  const { aiConfig, updateAIConfig } = useAppStore();
  
  const [formData, setFormData] = React.useState({
    apiEndpoint: aiConfig.apiEndpoint,
    apiKey: aiConfig.apiKey,
    model: aiConfig.model,
    enabledFeatures: { ...aiConfig.enabledFeatures },
    healthReminders: { ...aiConfig.healthReminders }
  });
  const [isTesting, setIsTesting] = React.useState(false);

  const handleSave = () => {
    updateAIConfig(formData);
    toast.success('AI配置已保存');
    navigate(-1);
  };

  const handleTestConnection = async () => {
    setIsTesting(true);
    try {
      const response = await fetch(formData.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${formData.apiKey}`
        },
        body: JSON.stringify({
          model: formData.model,
          messages: [{ role: 'user', content: '测试连接' }],
          max_tokens: 10
        })
      });

      if (response.ok) {
        toast.success('API连接测试成功');
      } else {
        toast.error('API连接测试失败');
      }
    } catch (error) {
      toast.error('API连接测试失败：' + (error as Error).message);
    } finally {
      setIsTesting(false);
    }
  };

  const models = [
    { value: 'Qwen/Qwen3-8B', label: 'Qwen/Qwen3-8B' }
  ];

  return (
    <div className="h-full flex flex-col bg-white">
      {/* 页面头部 */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => navigate('/')}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-600"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-medium text-gray-900">
              AI配置
            </h1>
          </div>
          
          <button
            onClick={handleSave}
            className="flex items-center space-x-2 px-4 py-2 bg-black text-white rounded-lg hover:bg-gray-800 transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>保存</span>
          </button>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
        <div className="max-w-2xl mx-auto space-y-8">
          {/* API配置 */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              API配置
            </h2>
            
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API端点
                </label>
                <input
                  type="text"
                  value={formData.apiEndpoint}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiEndpoint: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="https://api.siliconflow.cn/v1/chat/completions"
                />
                <p className="text-xs text-gray-500 mt-1">
                  默认为硅基流动 API，支持OpenAI兼容格式
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  API密钥
                </label>
                <input
                  type="password"
                  value={formData.apiKey}
                  onChange={(e) => setFormData(prev => ({ ...prev, apiKey: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900 placeholder-gray-400"
                  placeholder="..."
                />
                <p className="text-xs text-gray-500 mt-1">
                  您的API密钥将安全地存储在本地浏览器中
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  模型选择
                </label>
                <div className="relative">
                  <input
                    type="text"
                    list="model-options"
                    value={formData.model}
                    onChange={(e) => setFormData(prev => ({ ...prev, model: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                    placeholder="输入或选择模型名称"
                  />
                  <datalist id="model-options">
                    {models.map(model => (
                      <option key={model.value} value={model.value}>
                        {model.label}
                      </option>
                    ))}
                  </datalist>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  支持自定义模型名称（如 deepseek-chat, claude-3-opus 等）
                </p>
              </div>
              
              <button
                onClick={handleTestConnection}
                disabled={isTesting}
                className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent" />
                ) : (
                  <TestTube className="w-4 h-4" />
                )}
                <span>{isTesting ? '测试中...' : '测试连接'}</span>
              </button>
            </div>
          </div>

          {/* AI功能开关 */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              AI功能设置
            </h2>
            
            <div className="space-y-4">
              {[
                { key: 'naturalLanguageParse', label: '自然语言解析', desc: '自动解析任务描述中的时间、优先级等信息' },
                { key: 'timeEstimation', label: '智能时间预估', desc: '基于历史数据预估任务所需时间' },
                { key: 'autoSchedule', label: '自动排程', desc: '根据优先级和时间自动安排任务' },
                { key: 'dailySuggestion', label: '每日建议', desc: '生成每日任务安排建议' },
                { key: 'progressAnalysis', label: '进度分析', desc: '分析任务完成情况和效率' }
              ].map(feature => (
                <div key={feature.key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900">{feature.label}</div>
                    <div className="text-sm text-gray-500">{feature.desc}</div>
                  </div>
                  <button
                    onClick={() => setFormData(prev => ({
                      ...prev,
                      enabledFeatures: {
                        ...prev.enabledFeatures,
                        [feature.key]: !prev.enabledFeatures[feature.key as keyof typeof prev.enabledFeatures]
                      }
                    }))}
                    className={`w-12 h-6 rounded-full transition-colors ${
                      formData.enabledFeatures[feature.key as keyof typeof formData.enabledFeatures]
                        ? 'bg-black'
                        : 'bg-gray-200'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 bg-white rounded-full transition-transform ${
                        formData.enabledFeatures[feature.key as keyof typeof formData.enabledFeatures]
                          ? 'translate-x-6'
                          : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 健康提醒设置 */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              健康提醒设置
            </h2>
            
            <div className="space-y-4">
              {[
                { 
                  key: 'waterReminder', 
                  intervalKey: 'waterInterval',
                  label: '喝水提醒', 
                  desc: '定时提醒补充水分',
                  defaultInterval: 120
                },
                { 
                  key: 'standReminder', 
                  intervalKey: 'standInterval',
                  label: '站立提醒', 
                  desc: '提醒起身活动，避免久坐',
                  defaultInterval: 60
                },
                { 
                  key: 'eyeRestReminder', 
                  intervalKey: 'eyeRestInterval',
                  label: '眼睛休息', 
                  desc: '提醒眼部休息，保护视力',
                  defaultInterval: 45
                }
              ].map(reminder => (
                <div key={reminder.key} className="p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-medium text-gray-900">{reminder.label}</div>
                      <div className="text-sm text-gray-500">{reminder.desc}</div>
                    </div>
                    <button
                      onClick={() => setFormData(prev => ({
                        ...prev,
                        healthReminders: {
                          ...prev.healthReminders,
                          [reminder.key]: !prev.healthReminders[reminder.key as keyof typeof prev.healthReminders]
                        }
                      }))}
                      className={`w-12 h-6 rounded-full transition-colors ${
                        formData.healthReminders[reminder.key as keyof typeof formData.healthReminders]
                          ? 'bg-black'
                          : 'bg-gray-200'
                      }`}
                    >
                      <div
                        className={`w-5 h-5 bg-white rounded-full transition-transform ${
                          formData.healthReminders[reminder.key as keyof typeof formData.healthReminders]
                            ? 'translate-x-6'
                            : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  
                  {formData.healthReminders[reminder.key as keyof typeof formData.healthReminders] && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        提醒间隔（分钟）
                      </label>
                      <input
                        type="number"
                        value={formData.healthReminders[reminder.intervalKey as keyof typeof formData.healthReminders] as number}
                        onChange={(e) => setFormData(prev => ({
                          ...prev,
                          healthReminders: {
                            ...prev.healthReminders,
                            [reminder.intervalKey]: parseInt(e.target.value) || reminder.defaultInterval
                          }
                        }))}
                        className="w-32 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-gray-900"
                        min="15"
                        step="15"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 使用说明 */}
          <div className="bg-white rounded-lg p-6 border border-gray-200">
            <h2 className="text-lg font-medium text-gray-900 mb-6">
              使用说明
            </h2>
            
            <div className="space-y-3 text-sm text-gray-600">
              <p>• 硅基流动 API：注册后获取API密钥，支持多种开源模型</p>
              <p>• 自然语言解析：输入"明天下午3点开项目会议，预计1小时"即可自动解析</p>
              <p>• 智能排程：AI会根据任务优先级、截止时间、预估时长自动安排</p>
              <p>• 健康提醒：会在任务安排中自动插入休息提醒</p>
              <p>• 所有配置都保存在本地浏览器中，不会上传到服务器</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AIConfig;