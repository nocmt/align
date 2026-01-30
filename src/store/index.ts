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
  TaskCategory
} from '@/types';
import { toast } from 'sonner';

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
          max_tokens: 1000
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
      // 尝试解析JSON响应
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
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
              dailySuggestion: content
            };
          case 'analyze':
            return {
              progressAnalysis: this.parseProgressAnalysis(parsed)
            };
          default:
            return {};
        }
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
    return {
      title: parsed.title || '',
      description: parsed.description,
      startTime: parsed.startTime ? new Date(parsed.startTime) : undefined,
      endTime: parsed.endTime ? new Date(parsed.endTime) : undefined,
      estimatedDuration: parsed.estimatedDuration ? Number(parsed.estimatedDuration) : undefined,
      category: this.validateCategory(parsed.category),
      priority: this.validatePriority(parsed.priority)
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
        model: 'Qwen/Qwen2.5-7B-Instruct',
        enabledFeatures: {
          naturalLanguageParse: true,
          timeEstimation: true,
          autoSchedule: false,
          dailySuggestion: false,
          progressAnalysis: false
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
          set(state => ({ tasks: [...state.tasks, newTask] }));
          toast.success('任务添加成功');
        } catch (error) {
          console.error('【任务管理】添加任务失败:', error);
          toast.error('添加任务失败');
        }
      },

      updateTask: async (id, updates) => {
        try {
          await db.updateTask(id, updates);
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === id ? { ...task, ...updates } : task
            )
          }));
          toast.success('任务更新成功');
        } catch (error) {
          console.error('【任务管理】更新任务失败:', error);
          toast.error('更新任务失败');
        }
      },

      deleteTask: async (id) => {
        try {
          await db.deleteTask(id);
          set(state => ({
            tasks: state.tasks.filter(task => task.id !== id)
          }));
          toast.success('任务删除成功');
        } catch (error) {
          console.error('【任务管理】删除任务失败:', error);
          toast.error('删除任务失败');
        }
      },

      moveTask: async (id, newStartTime, newEndTime) => {
        try {
          await db.updateTask(id, { startTime: newStartTime, endTime: newEndTime });
          set(state => ({
            tasks: state.tasks.map(task => 
              task.id === id 
                ? { ...task, startTime: newStartTime, endTime: newEndTime }
                : task
            )
          }));
        } catch (error) {
          console.error('【任务管理】移动任务失败:', error);
          toast.error('移动任务失败');
        }
      },

      batchUpdateTaskStatus: async (taskIds, status) => {
        try {
          await db.batchUpdateTaskStatus(taskIds, status);
          set(state => ({
            tasks: state.tasks.map(task => 
              taskIds.includes(task.id) 
                ? { ...task, status, completedAt: status === 'completed' ? new Date() : undefined }
                : task
            )
          }));
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
      parseNaturalLanguage: async (input) => {
        const state = get();
        if (!state.aiConfig.enabledFeatures.naturalLanguageParse) {
          return {};
        }

        set({ isAIProcessing: true });
        try {
          const prompt = `解析以下任务描述，提取任务的关键信息：
输入："${input}"

请返回JSON格式：
{
  "title": "任务标题",
  "description": "详细描述",
  "startTime": "开始时间（ISO格式）",
  "endTime": "结束时间（ISO格式）",
  "estimatedDuration": "预估时长（分钟）",
  "category": "任务类别（work/study/health/life/other）",
  "priority": "优先级（urgent-important/urgent-unimportant/important-not-urgent/not-important-not-urgent）"
}`;

          const response = await aiService.sendRequest({
            prompt,
            feature: 'parse'
          });

          if (response.success && response.data?.parsedTask) {
            toast.success('AI解析成功');
            return response.data.parsedTask;
          } else {
            toast.error(response.error || 'AI解析失败');
            return {};
          }
        } catch (error) {
          console.error('【AI解析】失败:', error);
          toast.error('AI解析失败');
          return {};
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
          
          toast.success('AI配置更新成功');
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
          toast.success('工作作息更新成功');
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
          const [tasks, aiConfig, workSchedule, analytics, templates] = await Promise.all([
            db.getAllTasks(),
            db.getAIConfig(),
            db.getWorkSchedule(),
            db.getAnalyticsData(),
            db.getAllTemplates()
          ]);

          set({
            tasks,
            aiConfig: aiConfig || get().aiConfig,
            workSchedule: workSchedule || get().workSchedule,
            analytics,
            templates
          });

          // 确保 AI Service 配置同步
          if (aiConfig) {
            aiService.setConfig(aiConfig);
          }
        } catch (error) {
          console.error('【数据加载】初始数据加载失败:', error);
          toast.error('数据加载失败');
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
        tasks: state.tasks,
        currentWeek: state.currentWeek,
        selectedView: state.selectedView,
        aiConfig: state.aiConfig,
        workSchedule: state.workSchedule,
        templates: state.templates,
        sidebarOpen: state.sidebarOpen
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