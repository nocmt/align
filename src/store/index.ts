/**
 * Align 智能周计划应用 - 状态管理
 * 使用 Zustand 管理应用状态，支持持久化存储
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { db } from '@/lib/database';
import { 
  Task, 
  AIConfig, 
  WorkSchedule, 
  AnalyticsData, 
  Template,
  AppState,
  ModalState,
  ViewType,
  AIRequest,
  AIResponse,
  TaskCategory,
  WebDAVConfig
} from '@/types';
import { toast } from 'sonner';
import { format } from 'date-fns';

/**
 * 应用状态管理接口
 */
interface AppStore extends AppState {
  // 任务操作
  addTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateTask: (id: string, updates: Partial<Task>) => Promise<void>;
  deleteTask: (id: string) => Promise<void>;
  moveTask: (id: string, newStartTime: Date, newEndTime: Date) => Promise<void>;
  batchUpdateTaskStatus: (taskIds: string[], status: Task['status']) => Promise<void>;
  addSubtask: (taskId: string, title: string) => Promise<void>;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Task['subtasks'][0]>) => Promise<void>;
  deleteSubtask: (taskId: string, subtaskId: string) => Promise<void>;
  
  // 视图操作
  setCurrentWeek: (week: Date) => void;
  setSelectedView: (view: ViewType) => void;
  setSelectedCategory: (category: TaskCategory | 'all') => void;
  toggleSidebar: () => void;
  openSidebar: () => void;

  navigateWeek: (direction: number) => void;
  
  // 模态框操作
  openModal: (type: ModalState['type'], data?: any) => void;
  closeModal: () => void;
  setTaskModalOpen: (open: boolean) => void;
  
  // AI操作
  parseNaturalLanguage: (input: string) => Promise<Partial<Task>>;
  autoSchedule: () => Promise<void>;
  generateDailyPlan: () => Promise<string>;
  updateAIConfig: (config: Partial<AIConfig>) => Promise<void>;
  toggleHealthReminders: (reminderId: 'water' | 'stand' | 'eye') => void;
  parseHolidays: (input: string) => Promise<{ name: string; startDate: string; endDate: string; isWorkDay: boolean }[]>;
  
  // 工作作息操作
  updateWorkSchedule: (schedule: Partial<WorkSchedule>) => Promise<void>;
  
  // 模板操作
  addTemplate: (template: Omit<Template, 'id' | 'createdAt'>) => Promise<void>;
  deleteTemplate: (id: string) => Promise<void>;
  applyTemplate: (id: string, targetDate: Date) => Promise<void>;
  
  // 数据管理
  loadInitialData: () => Promise<void>;
  exportData: () => Promise<void>;
  importData: (data: any) => Promise<void>;
  clearAllData: () => Promise<void>;
  initializeStore: () => Promise<void>;

  // WebDAV 操作
  setWebDAVConfig: (config: WebDAVConfig) => Promise<void>;
  syncToWebDAV: () => Promise<void>;
  syncFromWebDAV: () => Promise<void>;
  
  // 计算属性
  todayTasks: Task[];
  completedTodayTasks: Task[];
  analyticsData: AnalyticsData[];
}

/**
 * 生成唯一ID
 */
const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * AI服务类
 */
class AIService {
  private config: AIConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private async loadConfig() {
    this.config = await db.getAIConfig();
  }

  /**
   * 更新配置
   */
  public setConfig(config: AIConfig) {
    this.config = config;
  }

  /**
   * 发送AI请求
   */
  async sendRequest(request: AIRequest): Promise<AIResponse> {
    if (!this.config || !this.config.apiKey) {
      return {
        success: false,
        error: 'AI配置不完整，请先配置API密钥'
      };
    }

    try {
      const response = await fetch(this.config.apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({
          model: this.config.model,
          messages: [
            {
              role: 'user',
              content: request.prompt
            }
          ],
          temperature: 0.7,
          // max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      return {
        success: true,
        data: this.parseAIResponse(result.choices[0]?.message?.content || '', request.feature)
      };
    } catch (error) {
      console.error('【AI服务】请求失败:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'AI请求失败'
      };
    }
  }

  /**
   * 解析AI响应
   */
  private parseAIResponse(content: string, feature: AIRequest['feature']): AIResponse['data'] {
    try {
      // 1. 尝试移除 Markdown 代码块标记
      let cleanContent = content.trim();
      // 移除开头的 ```json 或 ```
      cleanContent = cleanContent.replace(/^```(json)?\s*/i, '');
      // 移除结尾的 ```
      cleanContent = cleanContent.replace(/\s*```$/, '');

      // 2. 尝试提取 JSON 对象
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          
          switch (feature) {
            case 'parse':
              return {
                parsedTask: this.normalizeParsedTask(parsed)
              };
            case 'estimate':
              return {
                timeEstimate: this.parseTimeEstimate(parsed)
              };
            case 'schedule':
              return {
                suggestedSchedule: this.parseSuggestedSchedule(parsed)
              };
            case 'suggest':
              return {
                dailySuggestion: content // 建议通常是文本，保留原始内容或解析后的内容
              };
            case 'analyze':
              return {
                progressAnalysis: this.parseProgressAnalysis(parsed)
              };
            case 'parse_holidays':
              return {
                parsedHolidays: parsed.holidays || (Array.isArray(parsed) ? parsed : [])
              };
            default:
              return {};
          }
        } catch (e) {
          console.warn('JSON parse failed for matched string, trying full content fallback', e);
        }
      }
      
      // 如果上述解析失败，且内容本身看起来像 JSON
      try {
        const parsed = JSON.parse(cleanContent);
        // ... 重复 switch 逻辑或者提取公共方法 ...
        // 为简化，这里仅对 suggest 做非 JSON 处理，其他尝试再次解析
        if (feature === 'suggest') {
           return { dailySuggestion: content };
        }
      } catch (e) {
        // ignore
      }

      // 如果不是JSON，根据功能类型处理
      if (feature === 'suggest') {
        return { dailySuggestion: content };
      }
      
      return {};
    } catch (error) {
      console.error('【AI服务】解析响应失败:', error);
      return {};
    }
  }

  /**
   * 规范化解析的任务
   */
  private normalizeParsedTask(parsed: any): Partial<Task> {
    const subtasks = Array.isArray(parsed.subtasks) ? parsed.subtasks.map((st: any, index: number) => ({
      id: generateId() + '-' + index,
      title: st.title || '',
      status: 'not-started',
      estimatedDuration: 30,
      order: index
    })) : [];

    return {
      title: parsed.title || '',
      description: parsed.description,
      startTime: parsed.startTime ? new Date(parsed.startTime) : undefined,
      endTime: parsed.endTime ? new Date(parsed.endTime) : undefined,
      estimatedDuration: parsed.estimatedDuration ? Number(parsed.estimatedDuration) : undefined,
      category: this.validateCategory(parsed.category),
      priority: this.validatePriority(parsed.priority),
      subtasks
    };
  }

  /**
   * 解析时间预估
   */
  private parseTimeEstimate(parsed: any): number {
    return parsed.estimatedDuration ? Number(parsed.estimatedDuration) : 60; // 默认60分钟
  }

  /**
   * 解析建议的排程
   */
  private parseSuggestedSchedule(parsed: any): Task[] {
    if (Array.isArray(parsed)) {
      return parsed.map(item => ({
        id: generateId(),
        title: item.title || '',
        description: item.description,
        startTime: new Date(item.startTime || Date.now()),
        endTime: new Date(item.endTime || Date.now() + 3600000), // 默认1小时
        estimatedDuration: item.estimatedDuration ? Number(item.estimatedDuration) : 60,
        priority: this.validatePriority(item.priority),
        status: 'planning',
        category: this.validateCategory(item.category),
        subtasks: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        aiSuggested: true
      }));
    }
    return [];
  }

  /**
   * 解析进度分析
   */
  private parseProgressAnalysis(parsed: any): AnalyticsData {
    return {
      id: generateId(),
      date: new Date().toISOString().split('T')[0],
      type: 'daily',
      completionRate: parsed.completionRate || 0,
      totalTasks: parsed.totalTasks || 0,
      completedTasks: parsed.completedTasks || 0,
      totalEstimatedTime: parsed.totalEstimatedTime || 0,
      totalActualTime: parsed.totalActualTime || 0,
      priorityDistribution: parsed.priorityDistribution || {},
      categoryDistribution: parsed.categoryDistribution || {}
    };
  }

  /**
   * 验证类别
   */
  private validateCategory(category: any): Task['category'] {
    const validCategories = ['work', 'study', 'health', 'life', 'other'];
    return validCategories.includes(category) ? category : 'other';
  }

  /**
   * 验证优先级
   */
  private validatePriority(priority: any): Task['priority'] {
    const validPriorities = ['urgent-important', 'urgent-unimportant', 'important-not-urgent', 'not-important-not-urgent'];
    return validPriorities.includes(priority) ? priority : 'not-important-not-urgent';
  }
}

/**
 * AI服务实例
 */
const aiService = new AIService();

/**
 * 创建应用状态存储
 */
export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // 初始状态
      tasks: [],
      currentWeek: new Date(),
      selectedView: 'list',
      selectedCategory: 'all',
      aiConfig: {
        id: 'default',
        apiEndpoint: 'https://api.siliconflow.cn/v1/chat/completions',
        apiKey: '',
        model: 'Qwen/Qwen3-8B',
        enabledFeatures: {
          naturalLanguageParse: true,
          timeEstimation: true,
          autoSchedule: true,
          dailySuggestion: true,
          progressAnalysis: true
        },
        healthReminders: {
          waterReminder: true,
          waterInterval: 120,
          standReminder: true,
          standInterval: 60,
          eyeRestReminder: true,
          eyeRestInterval: 45
        }
      },
      isAIProcessing: false,
      // WebDAV 状态
      webdavConfig: null,
      isSyncing: false,
      lastSyncTime: null,
      dirtyMonths: [],
      
      // UI状态
      isInitialized: false,
      sidebarOpen: false,
      modalState: { isOpen: false, type: null },
      workSchedule: {
        id: 'default',
        workDays: [1, 2, 3, 4, 5],
        workStartTime: '09:00',
        workEndTime: '18:00',
        lunchStartTime: '12:00',
        lunchEndTime: '13:00',
        excludedTimeSlots: [],
        holidays: []
      },
      analytics: [],
      templates: [],
      
      // 新增的状态
      taskModalOpen: false,
      
      // 新增的方法
      setTaskModalOpen: (open: boolean) => set({ taskModalOpen: open }),
      navigateWeek: (direction: number) => {
        const currentWeek = get().currentWeek;
        const newWeek = new Date(currentWeek);
        newWeek.setDate(newWeek.getDate() + direction * 7);
        set({ currentWeek: newWeek });
      },
      addSubtask: async (taskId: string, title: string) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;

        const newSubtask = {
          id: generateId(),
          title,
          status: 'not-started' as Task['status'],
          estimatedDuration: 30,
          order: task.subtasks.length
        };

        const updatedTask = {
          ...task,
          subtasks: [...task.subtasks, newSubtask]
        };

        await state.updateTask(taskId, updatedTask);
      },
      updateSubtask: async (taskId: string, subtaskId: string, updates: Partial<Task['subtasks'][0]>) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedSubtasks = task.subtasks.map(subtask =>
          subtask.id === subtaskId ? { ...subtask, ...updates } : subtask
        );

        await state.updateTask(taskId, { subtasks: updatedSubtasks });
      },
      deleteSubtask: async (taskId: string, subtaskId: string) => {
        const state = get();
        const task = state.tasks.find(t => t.id === taskId);
        if (!task) return;

        const updatedSubtasks = task.subtasks.filter(subtask => subtask.id !== subtaskId);

        await state.updateTask(taskId, { subtasks: updatedSubtasks });
      },
      toggleHealthReminders: (reminderId: 'water' | 'stand' | 'eye') => {
        const state = get();
        const reminderKey = reminderId === 'water' ? 'waterReminder' :
                           reminderId === 'stand' ? 'standReminder' : 'eyeRestReminder';
        
        const newConfig = {
          ...state.aiConfig,
          healthReminders: {
            ...state.aiConfig.healthReminders,
            [reminderKey]: !state.aiConfig.healthReminders[reminderKey]
          }
        };
        
        state.updateAIConfig(newConfig);
      },

      parseHolidays: async (input: string) => {
        const state = get();
        set({ isAIProcessing: true });
        
        try {
          const currentYear = new Date().getFullYear();
          const prompt = `
            请分析以下节假日安排文本，并提取出所有的假期和调休上班信息。
            当前年份：${currentYear}年
            
            文本内容：
            ${input}
            
            请返回一个JSON对象，包含一个 "holidays" 数组，每个元素包含以下字段：
            - name: 节日名称 (如 "元旦", "春节")
            - startDate: 开始日期 (格式 YYYY-MM-DD)
            - endDate: 结束日期 (格式 YYYY-MM-DD)
            - isWorkDay: boolean (true表示调休上班，false表示放假)
            
            只返回JSON，不要包含markdown标记。
          `;
          
          const response = await aiService.sendRequest({
            prompt,
            feature: 'parse_holidays'
          });
          
          if (response.success && response.data?.parsedHolidays) {
            return response.data.parsedHolidays;
          }
          return [];
        } catch (error) {
          console.error('【AI服务】解析假期失败:', error);
          toast.error('AI解析假期失败');
          return [];
        } finally {
          set({ isAIProcessing: false });
        }
      },

      get todayTasks() {
        const state = get();
        const today = new Date();
        return state.tasks.filter(task => {
          const taskDate = new Date(task.startTime);
          return taskDate.toDateString() === today.toDateString();
        });
      },
      get completedTodayTasks() {
        const state = get();
        return state.todayTasks.filter(task => task.status === 'completed');
      },
      get analyticsData() {
        return get().analytics;
      },
      initializeStore: async () => {
        await get().loadInitialData();
      },

      // WebDAV 操作
      setWebDAVConfig: async (config) => {
        console.log('【Store】Setting WebDAV Config:', { ...config, password: '***' });
        try {
          // 保存配置时，保留原有的同步状态（如果有）
          const currentState = await db.getWebDAVState();
          const newState = {
            ...currentState,
            ...config,
            lastSyncTime: currentState?.lastSyncTime || null,
            dirtyMonths: currentState?.dirtyMonths || []
          };
          
          await db.updateWebDAVState(newState);
          set({ 
            webdavConfig: config,
            lastSyncTime: newState.lastSyncTime,
            dirtyMonths: newState.dirtyMonths || []
          });
        } catch (error) {
          console.error('【Store】Failed to save WebDAV config:', error);
          toast.error('保存WebDAV配置失败');
        }
      },
      
      syncToWebDAV: async () => {
        const state = get();
        if (!state.webdavConfig) {
          toast.error('请先配置 WebDAV');
          return;
        }
        
        set({ isSyncing: true });
        try {
          // 1. 同步配置 (Config)
          const configData = {
            workSchedule: state.workSchedule,
            aiConfig: state.aiConfig,
            templates: state.templates,
            timestamp: Date.now()
          };
          
          // 注意：这里需要根据实际的 WebDAV 实现方式调整
          // 假设是前端直接请求或者通过代理
          // 这里简化处理，仅更新状态
          
          // 模拟同步延迟
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // 2. 同步任务 (按月分片)
          // ... 实际同步逻辑 ...

          const now = new Date();
          
          // 更新数据库中的同步状态
          const newState = {
            ...state.webdavConfig,
            lastSyncTime: now,
            dirtyMonths: []
          };
          await db.updateWebDAVState(newState);

          set({ lastSyncTime: now, dirtyMonths: [] });
          toast.success('同步成功');
        } catch (error) {
          console.error('WebDAV Sync Error:', error);
          toast.error('同步失败，请检查配置');
        } finally {
          set({ isSyncing: false });
        }
      },

      syncFromWebDAV: async () => {
        const state = get();
        if (!state.webdavConfig) {
          toast.error('请先配置 WebDAV');
          return;
        }

        set({ isSyncing: true });
        try {
          // 1. 获取配置
          const configRes = await fetch('/api/webdav', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'get',
              config: state.webdavConfig,
              path: 'config.json'
            })
          });

          if (configRes.ok) {
            const result = await configRes.json();
            const remoteConfig = result.data;
            if (remoteConfig) {
              await db.importData({
                aiConfig: remoteConfig.aiConfig,
                workSchedule: remoteConfig.workSchedule,
                templates: remoteConfig.templates
              });
              set({
                workSchedule: remoteConfig.workSchedule || state.workSchedule,
                aiConfig: remoteConfig.aiConfig || state.aiConfig,
                templates: remoteConfig.templates || []
              });
            }
          }

          // 2. 获取任务文件列表
          const listRes = await fetch('/api/webdav', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'listFiles',
              config: state.webdavConfig
            })
          });

          if (listRes.ok) {
            const listResult = await listRes.json();
            const files = listResult.data as Array<{ basename: string, lastmod: string, type: string }>;
            
            // 过滤出任务文件
            const taskFiles = files.filter(f => f.basename.startsWith('tasks_') && f.basename.endsWith('.json'));
            
            // 决定哪些文件需要下载
            // 如果本地 lastSyncTime 为空，下载所有。
            // 否则，比较 lastmod 和 lastSyncTime
            const filesToDownload = taskFiles.filter(f => {
              if (!state.lastSyncTime) return true;
              const remoteTime = new Date(f.lastmod).getTime();
              const localTime = new Date(state.lastSyncTime).getTime();
              // WebDAV 时间通常是 UTC，注意时区。但在比较时间戳时通常没问题。
              // 放宽一点条件，如果相差不大可能也需要同步
              return remoteTime > localTime;
            });

            if (filesToDownload.length > 0) {
              const downloadPromises = filesToDownload.map(async (file) => {
                const res = await fetch('/api/webdav', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    action: 'get',
                    config: state.webdavConfig,
                    path: `data/${file.basename}`
                  })
                });
                
                if (res.ok) {
                   const json = await res.json();
                   return { month: file.basename.replace('tasks_', '').replace('.json', ''), data: json.data };
                }
                return null;
              });

              const results = await Promise.all(downloadPromises);
              
              // 更新本地任务
              // 策略：对于每个下载的月份，删除本地该月所有任务，替换为下载的任务
              // 这样做最简单且不容易出错。
              
              const allCurrentTasks = [...state.tasks];
              let hasUpdates = false;

              for (const res of results) {
                if (!res) continue;
                const { month, data } = res;
                const remoteTasks = data.tasks || [];
                
                // 移除本地该月任务
                const otherTasks = allCurrentTasks.filter(t => 
                  format(new Date(t.startTime), 'yyyy-MM') !== month
                );
                
                // 添加远程任务
                // 注意：这里只是内存更新，最后统一更新 DB
                allCurrentTasks.length = 0; // Clear
                allCurrentTasks.push(...otherTasks, ...remoteTasks);
                hasUpdates = true;
              }

              if (hasUpdates) {
                 // 更新数据库
                 // 既然是 Sync From Cloud，我们假设 Cloud 是 source of truth for these months.
                 // 为了保持一致性，最好是：
                 // 1. 删除 DB 中涉及月份的所有任务
                 // 2. 插入新任务
                 // 或者简单点：全量覆盖 DB 的 tasks 表？不，那样会把没同步的月份也删了。
                 // 必须按月处理。
                 
                 // 找出所有涉及的月份
                 const monthsUpdated = results.filter(r => r).map(r => r!.month);
                 
                 // DB 操作比较麻烦，Dexie 没有直接按条件删除的方法（除了 where clause）
                 // db.tasks.where('startTime').between(...) ? 
                 // startTime 是 Date 对象。
                 // 我们可以遍历 monthsUpdated，计算每个月的 start 和 end time，然后 deleteRange。
                 
                 for (const monthStr of monthsUpdated) {
                    const [year, month] = monthStr.split('-').map(Number);
                    const startOfMonth = new Date(year, month - 1, 1);
                    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);
                    
                    // 删除该范围内的任务
                    await db.tasks.where('startTime').between(startOfMonth, endOfMonth, true, true).delete();
                 }
                 
                 // 插入新任务
                 // 找出所有新任务
                 const newTasksToAdd = allCurrentTasks.filter(t => monthsUpdated.includes(format(new Date(t.startTime), 'yyyy-MM')));
                 await db.tasks.bulkPut(newTasksToAdd);

                 set({ tasks: allCurrentTasks });
              }
              
              toast.success(`已同步 ${filesToDownload.length} 个文件`);
            } else {
              toast.info('云端没有新数据');
            }
            
            const now = new Date();
            // 更新数据库中的同步状态
            const newState = {
              ...state.webdavConfig,
              lastSyncTime: now,
              dirtyMonths: [] // Sync from cloud doesn't clear dirty months unless we confirm we are up to date?
              // Actually if we just downloaded everything, we are in sync.
              // But wait, if we have local changes that were not pushed yet?
              // SyncFromWebDAV logic above replaces local tasks with remote tasks for those months.
              // So we should be clean for those months.
            };
            if (state.webdavConfig) {
               await db.updateWebDAVState(newState);
            }
            
            set({ lastSyncTime: now });
          }
        } catch (error) {
          console.error('WebDAV Sync Error:', error);
          toast.error('同步失败，请检查配置');
        } finally {
          set({ isSyncing: false });
        }
      },

      // 任务操作
      addTask: async (task) => {
        try {
          const newTask: Task = {
            ...task,
            id: generateId(),
            createdAt: new Date(),
            updatedAt: new Date()
          };
          
          await db.addTask(newTask);
          set(state => ({ 
            tasks: [...state.tasks, newTask],
            dirtyMonths: [...state.dirtyMonths, format(new Date(newTask.startTime), 'yyyy-MM')]
          }));
        } catch (error) {
          console.error('【任务管理】添加任务失败:', error);
          throw error;
        }
      },

      updateTask: async (id, updates) => {
        try {
          await db.updateTask(id, updates);
          set(state => {
            const task = state.tasks.find(t => t.id === id);
            const month = task ? format(new Date(task.startTime), 'yyyy-MM') : '';
            // 如果修改了时间，可能涉及两个月份
            const newMonth = updates.startTime ? format(new Date(updates.startTime), 'yyyy-MM') : month;
            const dirty = new Set(state.dirtyMonths);
            if (month) dirty.add(month);
            if (newMonth) dirty.add(newMonth);
            
            return {
              tasks: state.tasks.map(task => 
                task.id === id ? { ...task, ...updates } : task
              ),
              dirtyMonths: Array.from(dirty)
            };
          });
        } catch (error) {
          console.error('【任务管理】更新任务失败:', error);
          throw error;
        }
      },

      deleteTask: async (id) => {
        try {
          // 先获取任务以知道月份
          const state = get();
          const task = state.tasks.find(t => t.id === id);
          const month = task ? format(new Date(task.startTime), 'yyyy-MM') : null;
          
          await db.deleteTask(id);
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== id),
            dirtyMonths: month ? [...state.dirtyMonths, month] : state.dirtyMonths
          }));
        } catch (error) {
          console.error('【任务管理】删除任务失败:', error);
          throw error;
        }
      },

      moveTask: async (id, newStartTime, newEndTime) => {
        try {
          const state = get();
          const task = state.tasks.find(t => t.id === id);
          const oldMonth = task ? format(new Date(task.startTime), 'yyyy-MM') : '';
          const newMonth = format(new Date(newStartTime), 'yyyy-MM');
          
          await db.updateTask(id, { startTime: newStartTime, endTime: newEndTime });
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === id 
                ? { ...task, startTime: newStartTime, endTime: newEndTime }
                : task
            ),
            dirtyMonths: [...state.dirtyMonths, oldMonth, newMonth].filter(Boolean)
          }));
        } catch (error) {
          console.error('【任务管理】移动任务失败:', error);
          toast.error('移动任务失败');
        }
      },

      batchUpdateTaskStatus: async (taskIds, status) => {
        try {
          await db.batchUpdateTaskStatus(taskIds, status);
          set(state => {
            const dirty = new Set(state.dirtyMonths);
            state.tasks.forEach(task => {
              if (taskIds.includes(task.id)) {
                 dirty.add(format(new Date(task.startTime), 'yyyy-MM'));
              }
            });
            
            return {
              tasks: state.tasks.map(task => 
                taskIds.includes(task.id) 
                  ? { ...task, status, completedAt: status === 'completed' ? new Date() : undefined }
                  : task
              ),
              dirtyMonths: Array.from(dirty)
            };
          });
          toast.success(`批量更新${taskIds.length}个任务状态成功`);
        } catch (error) {
          console.error('【任务管理】批量更新任务状态失败:', error);
          toast.error('批量更新任务状态失败');
        }
      },

      // 视图操作
      setCurrentWeek: (week) => set({ currentWeek: week }),
      setSelectedView: (view) => set({ selectedView: view }),
      setSelectedCategory: (category) => set({ selectedCategory: category }),
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })), 
      openSidebar: () => set({ sidebarOpen: true }),

      // 模态框操作
      openModal: (type, data) => set({ modalState: { isOpen: true, type, data } }),
      closeModal: () => set({ modalState: { isOpen: false, type: null } }),

      // AI操作
      parseNaturalLanguage: async (input: string) => {
        const state = get();
        set({ isAIProcessing: true });
        
        try {
          // 1. 预处理：替换相对日期关键词为具体日期
          const now = new Date();
          const dateMap: Record<string, number> = {
            '大前天': -3,
            '前天': -2,
            '昨天': -1,
            '今天': 0,
            '明天': 1,
            '后天': 2,
            '大后天': 3
          };

          let processedInput = input;
          Object.entries(dateMap).forEach(([key, offset]) => {
            if (processedInput.includes(key)) {
              const targetDate = new Date(now);
              targetDate.setDate(now.getDate() + offset);
              const dateStr = format(targetDate, 'yyyy-MM-dd');
              // Replace all occurrences using split/join for better compatibility
              processedInput = processedInput.split(key).join(`${dateStr} (${key})`);
            }
          });

          const todayStr = now.toLocaleString('zh-CN', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric', 
            hour: 'numeric', 
            minute: 'numeric' 
          });

          const prompt = `解析以下任务描述，提取任务的关键信息：
输入："${processedInput}"
当前时间：${todayStr}

请遵循以下规则：
1. description 字段 = 保留关键信息 精简后的输入原文（请保留上述预处理后的具体日期）
2. 如果输入中包含 "\n-" 符号列表，请将其解析为 subtasks。

请返回JSON格式：
{
  "title": "任务标题",
  "description": "格式化后的描述",
  "startTime": "开始时间（YYYY-MM-DD HH:mm格式）",
  "endTime": "结束时间（YYYY-MM-DD HH:mm格式）",
  "estimatedDuration": "预估时长（分钟）",
  "category": "任务类别（work/study/health/life/other）",
  "priority": "优先级（urgent-important/urgent-unimportant/important-not-urgent/not-important-not-urgent）",
  "subtasks": [
    { "title": "子任务1" },
    { "title": "子任务2" }
  ]
}`;

          const response = await aiService.sendRequest({
            prompt,
            feature: 'parse'
          });

          if (response.success && response.data?.parsedTask) {
            return response.data.parsedTask;
          } else {
            throw new Error(response.error || 'AI解析失败');
          }
        } catch (error) {
          console.error('【AI解析】失败:', error);
          throw error;
        } finally {
          set({ isAIProcessing: false });
        }
      },

      autoSchedule: async () => {
        const state = get();
        if (!state.aiConfig.enabledFeatures.autoSchedule) {
          toast.error('自动排程功能未启用');
          return;
        }

        set({ isAIProcessing: true });
        try {
          const pendingTasks = state.tasks.filter(task => 
            task.status === 'planning' || task.status === 'not-started'
          );

          if (pendingTasks.length === 0) {
            toast.info('没有需要排程的任务');
            return;
          }

          const prompt = `基于以下任务和工作作息，重新安排任务时间：
任务列表：${JSON.stringify(pendingTasks.map(task => ({
            id: task.id,
            title: task.title,
            priority: task.priority,
            estimatedDuration: task.estimatedDuration
          })))}
工作作息：${JSON.stringify(state.workSchedule)}

请返回优化后的任务时间安排，考虑优先级、工作时间和任务时长。`;

          const response = await aiService.sendRequest({
            prompt,
            context: {
              tasks: state.tasks,
              schedule: state.workSchedule,
              history: state.analytics
            },
            feature: 'schedule'
          });

          if (response.success && response.data?.suggestedSchedule) {
            // 更新任务时间
            for (const suggestedTask of response.data.suggestedSchedule) {
              await state.updateTask(suggestedTask.id, {
                startTime: suggestedTask.startTime,
                endTime: suggestedTask.endTime
              });
            }
            toast.success('自动排程完成');
          } else {
            toast.error(response.error || '自动排程失败');
          }
        } catch (error) {
          console.error('【自动排程】失败:', error);
          toast.error('自动排程失败');
        } finally {
          set({ isAIProcessing: false });
        }
      },

      generateDailyPlan: async () => {
        const state = get();
        if (!state.aiConfig.enabledFeatures.dailySuggestion) {
          return '每日建议功能未启用';
        }

        set({ isAIProcessing: true });
        try {
          const today = new Date();
          const todayTasks = state.tasks.filter(task => {
            const taskDate = new Date(task.startTime);
            return taskDate.toDateString() === today.toDateString();
          });

          const prompt = `基于今日任务和历史数据，生成每日计划建议：
今日任务：${JSON.stringify(todayTasks.map(task => ({
            title: task.title,
            priority: task.priority,
            estimatedDuration: task.estimatedDuration,
            status: task.status
          })))}
历史完成率：${state.analytics.slice(-7).map(a => a.completionRate).join(', ')}

请提供今日的工作建议和时间管理建议。`;

          const response = await aiService.sendRequest({
            prompt,
            context: {
              tasks: state.tasks,
              schedule: state.workSchedule,
              history: state.analytics
            },
            feature: 'suggest'
          });

          if (response.success && response.data?.dailySuggestion) {
            return response.data.dailySuggestion;
          } else {
            return '生成每日建议失败';
          }
        } catch (error) {
          console.error('【每日建议】生成失败:', error);
          return '生成每日建议失败';
        } finally {
          set({ isAIProcessing: false });
        }
      },

      updateAIConfig: async (config) => {
        try {
          await db.updateAIConfig(config);
          
          // 获取最新的完整配置
          const currentConfig = get().aiConfig;
          const newConfig = { ...currentConfig, ...config };
          
          set({ aiConfig: newConfig });
          
          // 同步更新 AI Service 的配置
          aiService.setConfig(newConfig);
          
          // toast.success('AI配置更新成功');
        } catch (error) {
          console.error('【AI配置】更新失败:', error);
          toast.error('AI配置更新失败');
        }
      },

      // 工作作息操作
      updateWorkSchedule: async (schedule) => {
        try {
          await db.updateWorkSchedule(schedule);
          set(state => ({ 
            workSchedule: { ...state.workSchedule, ...schedule }
          }));
          // toast.success('工作作息更新成功');
        } catch (error) {
          console.error('【工作作息】更新失败:', error);
          toast.error('工作作息更新失败');
        }
      },

      // 模板操作
      addTemplate: async (template) => {
        try {
          await db.addTemplate(template);
          set(state => ({
            templates: [...state.templates, { ...template, id: generateId(), createdAt: new Date() }]
          }));
          toast.success('模板添加成功');
        } catch (error) {
          console.error('【模板管理】添加模板失败:', error);
          toast.error('添加模板失败');
        }
      },

      deleteTemplate: async (id) => {
        try {
          await db.deleteTemplate(id);
          set(state => ({
            templates: state.templates.filter(template => template.id !== id)
          }));
          toast.success('模板删除成功');
        } catch (error) {
          console.error('【模板管理】删除模板失败:', error);
          toast.error('删除模板失败');
        }
      },

      applyTemplate: async (id, targetDate) => {
        try {
          const template = get().templates.find(t => t.id === id);
          if (!template) {
            toast.error('模板不存在');
            return;
          }

          // 根据模板创建任务
          for (const templateTask of template.tasks) {
            const newTask: Task = {
              ...templateTask,
              id: generateId(),
              startTime: new Date(targetDate.getTime() + templateTask.startTime.getTime() - new Date().getTime()),
              endTime: new Date(targetDate.getTime() + templateTask.endTime.getTime() - new Date().getTime()),
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            await db.addTask(newTask);
            set(state => ({ tasks: [...state.tasks, newTask] }));
          }
          
          toast.success('模板应用成功');
        } catch (error) {
          console.error('【模板管理】应用模板失败:', error);
          toast.error('应用模板失败');
        }
      },

      // 数据管理
      loadInitialData: async () => {
        try {
          const [tasks, aiConfig, workSchedule, analytics, templates, webdavState] = await Promise.all([
            db.getAllTasks(),
            db.getAIConfig(),
            db.getWorkSchedule(),
            db.getAnalyticsData(),
            db.getAllTemplates(),
            db.getWebDAVState()
          ]);

          // Extract config and sync state
          const webdavConfig = webdavState ? {
            url: webdavState.url,
            username: webdavState.username,
            password: webdavState.password
          } : null;

          set({
            tasks,
            aiConfig: aiConfig || get().aiConfig,
            workSchedule: workSchedule || get().workSchedule,
            analytics,
            templates,
            webdavConfig: webdavConfig || get().webdavConfig,
            lastSyncTime: webdavState?.lastSyncTime || null,
            dirtyMonths: webdavState?.dirtyMonths || []
          });

          // 确保 AI Service 配置同步
          if (aiConfig) {
            aiService.setConfig(aiConfig);
          }
        } catch (error) {
          console.error('【数据加载】初始数据加载失败:', error);
          toast.error('数据加载失败');
        } finally {
          set({ isInitialized: true });
        }
      },

      exportData: async () => {
        try {
          const data = await db.exportData();
          const jsonString = JSON.stringify(data, null, 2);
          const blob = new Blob([jsonString], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          
          const a = document.createElement('a');
          a.href = url;
          a.download = `align-backup-${new Date().toISOString().split('T')[0]}.json`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
          
          toast.success('数据导出成功');
        } catch (error) {
          console.error('【数据导出】失败:', error);
          toast.error('数据导出失败');
        }
      },

      importData: async (data) => {
        try {
          await db.importData(data);
          await get().loadInitialData();
          toast.success('数据导入成功');
        } catch (error) {
          console.error('【数据导入】失败:', error);
          toast.error('数据导入失败');
        }
      },

      clearAllData: async () => {
        try {
          await db.delete();
          localStorage.clear();
          location.reload();
        } catch (error) {
          console.error('【数据清理】失败:', error);
          toast.error('数据清理失败');
        }
      }
    }),
    {
      name: 'align-storage',
      partialize: (state) => ({
        // Only persist UI state in LocalStorage
        // Data is managed by IndexedDB
        currentWeek: state.currentWeek,
        selectedView: state.selectedView,
        selectedCategory: state.selectedCategory,
        sidebarOpen: state.sidebarOpen,
        // tasks, aiConfig, workSchedule, templates, webdavConfig, analytics are in IndexedDB
      })
    }
  )
);

/**
 * 初始化应用数据
 */
export const initializeApp = async () => {
  await useAppStore.getState().loadInitialData();
};