import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Download, Upload, Trash2, Calendar, Clock, MapPin, Cloud, QrCode, Scan, RefreshCw, Loader2, Sparkles } from 'lucide-react';
import { useAppStore } from '../store';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { QRCodeSVG } from 'qrcode.react';
import { Html5Qrcode, Html5QrcodeScanner } from 'html5-qrcode';

/**
 * 设置页面
 * 提供工作作息配置、数据管理、假期设置等功能
 */
const Settings: React.FC = () => {
  const navigate = useNavigate();
  const { 
    workSchedule, updateWorkSchedule, exportData, importData, clearAllData,
    webdavConfig, setWebDAVConfig, syncToWebDAV, syncFromWebDAV, isSyncing, lastSyncTime,
    parseHolidays, isAIProcessing, aiConfig
  } = useAppStore();
  
  const [formData, setFormData] = React.useState({
    workDays: [...workSchedule.workDays],
    workStartTime: workSchedule.workStartTime,
    workEndTime: workSchedule.workEndTime,
    lunchStartTime: workSchedule.lunchStartTime,
    lunchEndTime: workSchedule.lunchEndTime,
    excludedTimeSlots: [...workSchedule.excludedTimeSlots],
    holidays: [...workSchedule.holidays]
  });

  // WebDAV Form State
  const [webdavForm, setWebdavForm] = React.useState({
    url: webdavConfig?.url || '',
    username: webdavConfig?.username || '',
    password: webdavConfig?.password || ''
  });

  const [showQR, setShowQR] = React.useState(false);
  const [showScanner, setShowScanner] = React.useState(false);
  const [isChecking, setIsChecking] = React.useState(false);
  const [scanImageInputRef, setScanImageInputRef] = React.useState<HTMLInputElement | null>(null);
  const scanFileRef = React.useRef<Html5Qrcode | null>(null);

  React.useEffect(() => {
    if (webdavConfig) {
      setWebdavForm({
        url: webdavConfig.url,
        username: webdavConfig.username,
        password: webdavConfig.password || ''
      });
    }
  }, [webdavConfig]);

  const applyScannedConfig = React.useCallback((decodedText: string) => {
    try {
      const config = JSON.parse(decodedText);
      if (config.url && config.username) {
        setWebdavForm({
          url: config.url,
          username: config.username,
          password: config.password || ''
        });
        toast.success('配置已扫描，请点击保存');
        return true;
      }
      console.error('【QR扫描】配置结构无效:', config);
      toast.error('无效的二维码配置：缺少 url 或 username');
      return false;
    } catch (e) {
      console.error('【QR扫描】解析失败:', e);
      toast.error('无法解析二维码：请确保扫描的是本应用生成的JSON配置');
      return false;
    }
  }, [setWebdavForm]);

  const handleScanImage = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      if (!scanFileRef.current) {
        scanFileRef.current = new Html5Qrcode('reader-file');
      }
      const decodedText = await scanFileRef.current.scanFile(file, true);
      const applied = applyScannedConfig(decodedText);
      if (applied) {
        setShowScanner(false);
      }
    } catch (error) {
      console.error('【QR扫描】图片识别失败:', error);
      toast.error('未识别到二维码，请更换清晰图片');
    } finally {
      event.target.value = '';
    }
  };

  // Scanner Effect
  React.useEffect(() => {
    if (showScanner) {
      const scanner = new Html5QrcodeScanner(
        "reader",
        { 
          fps: 10, 
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
          showTorchButtonIfSupported: true, // 开启闪光灯支持
          videoConstraints: {
            facingMode: { ideal: "environment" } // 优先使用后置摄像头
          },
          experimentalFeatures: {
            useBarCodeDetectorIfSupported: true
          }
        },
        /* verbose= */ false
      );
      
      scanner.render((decodedText) => {
        console.log('【QR扫描】扫描内容:', decodedText);
        const applied = applyScannedConfig(decodedText);
        if (applied) {
          scanner.clear().then(() => {
            setShowScanner(false);
          }).catch((err) => {
            console.error('【QR扫描】停止扫描失败:', err);
            setShowScanner(false);
          });
        }
      }, () => {
        // 扫描过程中的帧解析错误，忽略即可
      });

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [showScanner, applyScannedConfig]);

  const handleSaveWebDAV = () => {
    if (!webdavForm.url || !webdavForm.username || !webdavForm.password) {
      toast.error('请填写完整 WebDAV 配置');
      return;
    }
    setWebDAVConfig(webdavForm);
    toast.success('WebDAV 配置已保存');
  };

  const handleTestConnection = async () => {
    if (!webdavForm.url || !webdavForm.username || !webdavForm.password) {
      toast.error('请填写完整 WebDAV 配置');
      return;
    }
    
    setIsChecking(true);
    try {
      const response = await fetch('/api/webdav', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'check',
          config: webdavForm
        })
      });

      if (response.ok) {
        toast.success('连接成功');
      } else {
        throw new Error('连接失败');
      }
    } catch {
      toast.error('连接失败，请检查配置');
    } finally {
      setIsChecking(false);
    }
  };

  const [holidayInput, setHolidayInput] = React.useState('');

  const handleSave = () => {
    updateWorkSchedule(formData);
    toast.success('设置已保存');
    navigate('/');
  };

  const handleParseHoliday = async () => {
    if (!holidayInput.trim()) return;

    if (!aiConfig.apiKey && !aiConfig.model) {
      toast.error('请先在"AI配置"中设置API Key和模型');
      navigate('/ai-config');
      return;
    }

    try {
      const holidays = await parseHolidays(holidayInput);
      
      if (holidays && holidays.length > 0) {
        setFormData(prev => ({
          ...prev,
          holidays: [...prev.holidays, ...holidays]
        }));
        toast.success(`成功解析 ${holidays.length} 个假期信息`);
        setHolidayInput('');
      } else {
        toast.error('未解析到有效的假期信息，请检查输入内容');
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
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleParseHoliday}
                    disabled={!holidayInput.trim() || isAIProcessing}
                    className="flex items-center space-x-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isAIProcessing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>AI解析中...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>AI智能解析</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
              
              <div>
                {formData.holidays.length > 0 && (
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    已设置假期
                  </label>
                )}
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

          {/* WebDAV 设置 */}
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <h2 className="text-lg font-semibold mb-4 flex items-center space-x-2 text-gray-900">
              <Cloud className="w-5 h-5" />
              <span>多端同步 (WebDAV)</span>
            </h2>
            
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    服务器地址
                  </label>
                  <input
                    type="text"
                    value={webdavForm.url}
                    onChange={(e) => setWebdavForm(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://dav.jianguoyun.com/dav/"
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      用户名
                    </label>
                    <input
                      type="text"
                      value={webdavForm.username}
                      onChange={(e) => setWebdavForm(prev => ({ ...prev, username: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      密码 / 应用授权码
                    </label>
                    <input
                      type="password"
                      value={webdavForm.password}
                      onChange={(e) => setWebdavForm(prev => ({ ...prev, password: e.target.value }))}
                      className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  onClick={handleTestConnection}
                  disabled={isChecking}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isChecking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                  <span>测试连接</span>
                </button>
                
                <button
                  onClick={handleSaveWebDAV}
                  className="flex items-center space-x-2 px-4 py-2 bg-black text-white hover:bg-gray-800 rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  <span>保存配置</span>
                </button>

                <div className="flex-1" />

                <button
                  onClick={() => setShowQR(true)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                  title="生成配置二维码，供移动端扫描"
                >
                  <QrCode className="w-4 h-4" />
                  <span className="hidden sm:inline">生成二维码</span>
                </button>

                <button
                  onClick={() => setShowScanner(true)}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors"
                  title="扫描配置二维码"
                >
                  <Scan className="w-4 h-4" />
                  <span className="hidden sm:inline">扫码配置</span>
                </button>
              </div>

              {webdavConfig && (
                <div className="mt-4 p-4 bg-gray-50 rounded-lg border border-gray-200 flex items-center justify-between">
                  <div className="text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${lastSyncTime ? 'bg-green-500' : 'bg-gray-300'}`} />
                      <span>上次同步: {lastSyncTime ? format(new Date(lastSyncTime), 'yyyy-MM-dd HH:mm:ss') : '从未同步'}</span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={syncFromWebDAV}
                      disabled={isSyncing}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm disabled:opacity-50"
                    >
                      <Download className="w-4 h-4" />
                      <span>下载</span>
                    </button>
                    <button
                      onClick={syncToWebDAV}
                      disabled={isSyncing}
                      className="flex items-center space-x-2 px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg transition-colors text-sm disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4" />
                      <span>上传</span>
                    </button>
                  </div>
                </div>
              )}
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

      {/* QR Code Modal */}
      {showQR && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowQR(false)}>
          <div className="bg-white p-6 rounded-xl max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4 text-center text-gray-900">扫码导入配置</h3>
            <div className="flex justify-center p-4 bg-white rounded-lg">
              <QRCodeSVG 
                value={JSON.stringify(webdavForm)}
                size={240}
                level="H"
                includeMargin
              />
            </div>
            <p className="text-sm text-gray-500 text-center mt-4">
              请在手机端打开本应用，在设置中点击"扫码配置"
            </p>
            <button
              onClick={() => setShowQR(false)}
              className="w-full mt-6 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
            >
              关闭
            </button>
          </div>
        </div>
      )}

      {/* Scanner Modal */}
      {showScanner && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl max-w-sm w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-center text-gray-900">扫描二维码</h3>
            <div id="reader" className="w-full h-64 bg-black rounded-lg overflow-hidden"></div>
            <div id="reader-file" className="hidden"></div>
            <button
              onClick={() => scanImageInputRef?.click()}
              className="w-full mt-3 py-2 bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 rounded-lg transition-colors"
            >
              从相册识别
            </button>
            <input
              ref={setScanImageInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleScanImage}
              className="hidden"
            />
            <button
              onClick={() => setShowScanner(false)}
              className="w-full mt-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-900 rounded-lg transition-colors"
            >
              取消
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
