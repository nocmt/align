/**
 * Align 智能周计划应用 - 数据存储层
 * 使用 Dexie.js 封装 IndexedDB，提供类型安全的数据库操作
 */

import Dexie, { Table } from 'dexie';
import { 
  Task, 
  AIConfig, 
  WorkSchedule, 
  AnalyticsData, 
  Template,
  TaskStatus,
  TaskPriority,
  TaskCategory,
  WebDAVConfig,
  WebDAVSyncState
} from '@/types';

/**
 * Align 数据库类
 * 封装 IndexedDB 操作，提供类型安全的数据访问
 */
export class AlignDatabase extends Dexie {
  // 数据表定义
  tasks!: Table<Task, string>;
  aiConfig!: Table<AIConfig, string>;
  webdavConfig!: Table<WebDAVSyncState & { id: string }, string>;
  workSchedule!: Table<WorkSchedule, string>;
  analytics!: Table<AnalyticsData, string>;
  templates!: Table<Template, string>;

  constructor() {
    super('AlignDatabase');
    
    // 数据库版本和表结构定义
    this.version(1).stores({
      tasks: 'id, title, startTime, endTime, status, category, parentId',
      aiConfig: 'id',
      workSchedule: 'id',
      analytics: 'id, date, type',
      templates: 'id, name, type'
    });

    this.version(2).stores({
      webdavConfig: 'id'
    });

    // 初始化默认数据
    this.on('ready', async () => {
      await this.initializeDefaultData();
    });
  }

  /**
   * 初始化默认数据
   */
  private async initializeDefaultData(): Promise<void> {
    try {
      // 检查是否已有AI配置
      const aiConfigCount = await this.aiConfig.count();
      if (aiConfigCount === 0) {
        await this.aiConfig.add({
          id: 'default',
          apiEndpoint: 'https://api.siliconflow.cn/v1/chat/completions',
          apiKey: '',
          model: 'Qwen/Qwen3-8B',
          enabledFeatures: {
            naturalLanguageParse: true,
            timeEstimation: true,
            autoSchedule: false,
            dailySuggestion: false,
            progressAnalysis: false
          },
          healthReminders: {
            waterReminder: true,
            waterInterval: 120, // 2小时
            standReminder: true,
            standInterval: 60,  // 1小时
            eyeRestReminder: true,
            eyeRestInterval: 45 // 45分钟
          }
        });
      }

      // 检查是否已有工作作息配置
      const workScheduleCount = await this.workSchedule.count();
      if (workScheduleCount === 0) {
        await this.workSchedule.add({
          id: 'default',
          workDays: [1, 2, 3, 4, 5], // 周一到周五
          workStartTime: '09:00',
          workEndTime: '18:00',
          lunchStartTime: '12:00',
          lunchEndTime: '13:00',
          excludedTimeSlots: [],
          holidays: []
        });
      }
    } catch (error) {
      console.error('【数据存储】初始化默认数据失败:', error);
    }
  }

  /**
   * 任务相关操作
   */

  /**
   * 获取所有任务
   */
  async getAllTasks(): Promise<Task[]> {
    try {
      return await this.tasks.toArray();
    } catch (error) {
      console.error('【数据存储】获取所有任务失败:', error);
      return [];
    }
  }

  /**
   * 根据ID获取任务
   */
  async getTaskById(id: string): Promise<Task | undefined> {
    try {
      return await this.tasks.get(id);
    } catch (error) {
      console.error('【数据存储】获取任务失败:', error);
      return undefined;
    }
  }

  /**
   * 获取指定时间范围内的任务
   */
  async getTasksByTimeRange(startDate: Date, endDate: Date): Promise<Task[]> {
    try {
      return await this.tasks
        .where('startTime')
        .between(startDate, endDate, true, true)
        .toArray();
    } catch (error) {
      console.error('【数据存储】获取时间范围任务失败:', error);
      return [];
    }
  }

  /**
   * 获取指定状态的任务
   */
  async getTasksByStatus(status: TaskStatus): Promise<Task[]> {
    try {
      return await this.tasks.where('status').equals(status).toArray();
    } catch (error) {
      console.error('【数据存储】获取状态任务失败:', error);
      return [];
    }
  }

  /**
   * 添加任务
   */
  async addTask(task: Task): Promise<string> {
    try {
      const taskWithTimestamps = {
        ...task,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      await this.tasks.add(taskWithTimestamps);
      return task.id;
    } catch (error) {
      console.error('【数据存储】添加任务失败:', error);
      throw new Error('添加任务失败');
    }
  }

  /**
   * 更新任务
   */
  async updateTask(id: string, updates: Partial<Task>): Promise<void> {
    try {
      const updatesWithTimestamp = {
        ...updates,
        updatedAt: new Date()
      };
      
      await this.tasks.update(id, updatesWithTimestamp);
    } catch (error) {
      console.error('【数据存储】更新任务失败:', error);
      throw new Error('更新任务失败');
    }
  }

  /**
   * 删除任务
   */
  async deleteTask(id: string): Promise<void> {
    try {
      // 删除相关的子任务
      await this.tasks.where('parentId').equals(id).delete();
      // 删除主任务
      await this.tasks.delete(id);
    } catch (error) {
      console.error('【数据存储】删除任务失败:', error);
      throw new Error('删除任务失败');
    }
  }

  /**
   * 批量更新任务状态
   */
  async batchUpdateTaskStatus(taskIds: string[], status: TaskStatus): Promise<void> {
    for (const taskId of taskIds) {
      await this.updateTask(taskId, { status, updatedAt: new Date() });
    }
  }

  /**
   * AI配置相关操作
   */

  /**
   * 获取WebDAV状态
   */
  async getWebDAVState(): Promise<WebDAVSyncState | undefined> {
    try {
      const config = await this.webdavConfig.toArray();
      if (config.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { id, ...rest } = config[0];
        return rest as WebDAVSyncState;
      }
      return undefined;
    } catch (error) {
      console.error('【数据存储】获取WebDAV状态失败:', error);
      return undefined;
    }
  }

  /**
   * 更新WebDAV状态 (支持部分更新)
   */
  async updateWebDAVState(state: Partial<WebDAVSyncState>): Promise<void> {
    try {
      const existingConfig = await this.webdavConfig.toArray();
      if (existingConfig.length > 0) {
        await this.webdavConfig.update('default', state);
      } else {
        // 如果不存在，必须提供完整的 WebDAVConfig 部分才能创建有效记录
        // 这里假设调用者会保证这一点，或者我们只允许更新已存在的
        // 但如果是首次保存配置，state 应该包含完整的 config
        await this.webdavConfig.add({ ...(state as WebDAVSyncState), id: 'default' });
      }
    } catch (error) {
      console.error('【数据存储】更新WebDAV状态失败:', error);
      throw new Error('更新WebDAV状态失败');
    }
  }

  /**
   * 获取AI配置
   */
  async getAIConfig(): Promise<AIConfig | undefined> {
    try {
      const config = await this.aiConfig.toArray();
      return config.length > 0 ? config[0] : undefined;
    } catch (error) {
      console.error('【数据存储】获取AI配置失败:', error);
      return undefined;
    }
  }

  /**
   * 更新AI配置
   */
  async updateAIConfig(config: Partial<AIConfig>): Promise<void> {
    try {
      const existingConfig = await this.getAIConfig();
      if (existingConfig) {
        await this.aiConfig.update('default', config);
      } else {
        await this.aiConfig.add({ ...config, id: 'default' } as AIConfig);
      }
    } catch (error) {
      console.error('【数据存储】更新AI配置失败:', error);
      throw new Error('更新AI配置失败');
    }
  }

  /**
   * 工作作息相关操作
   */

  /**
   * 获取工作作息配置
   */
  async getWorkSchedule(): Promise<WorkSchedule | undefined> {
    try {
      const schedule = await this.workSchedule.toArray();
      return schedule.length > 0 ? schedule[0] : undefined;
    } catch (error) {
      console.error('【数据存储】获取工作作息失败:', error);
      return undefined;
    }
  }

  /**
   * 更新工作作息配置
   */
  async updateWorkSchedule(schedule: Partial<WorkSchedule>): Promise<void> {
    try {
      const existingSchedule = await this.getWorkSchedule();
      if (existingSchedule) {
        await this.workSchedule.update('default', schedule);
      } else {
        await this.workSchedule.add({ ...schedule, id: 'default' } as WorkSchedule);
      }
    } catch (error) {
      console.error('【数据存储】更新工作作息失败:', error);
      throw new Error('更新工作作息失败');
    }
  }

  /**
   * 数据分析相关操作
   */

  /**
   * 添加数据分析记录
   */
  async addAnalyticsData(data: Omit<AnalyticsData, 'id'>): Promise<string> {
    try {
      const id = this.generateId();
      await this.analytics.add({ ...data, id });
      return id;
    } catch (error) {
      console.error('【数据存储】添加分析数据失败:', error);
      throw new Error('添加分析数据失败');
    }
  }

  /**
   * 获取数据分析记录
   */
  async getAnalyticsData(type?: 'daily' | 'weekly' | 'monthly'): Promise<AnalyticsData[]> {
    try {
      if (type) {
        return await this.analytics.where('type').equals(type).toArray();
      }
      return await this.analytics.toArray();
    } catch (error) {
      console.error('【数据存储】获取分析数据失败:', error);
      return [];
    }
  }

  /**
   * 模板相关操作
   */

  /**
   * 获取所有模板
   */
  async getAllTemplates(): Promise<Template[]> {
    try {
      return await this.templates.toArray();
    } catch (error) {
      console.error('【数据存储】获取模板失败:', error);
      return [];
    }
  }

  /**
   * 添加模板
   */
  async addTemplate(template: Omit<Template, 'id' | 'createdAt'>): Promise<string> {
    try {
      const id = this.generateId();
      await this.templates.add({
        ...template,
        id,
        createdAt: new Date()
      });
      return id;
    } catch (error) {
      console.error('【数据存储】添加模板失败:', error);
      throw new Error('添加模板失败');
    }
  }

  /**
   * 删除模板
   */
  async deleteTemplate(id: string): Promise<void> {
    try {
      await this.templates.delete(id);
    } catch (error) {
      console.error('【数据存储】删除模板失败:', error);
      throw new Error('删除模板失败');
    }
  }

  /**
   * 数据导出
   */
  async exportData(): Promise<{
    tasks: Task[];
    aiConfig?: AIConfig;
    workSchedule?: WorkSchedule;
    analytics: AnalyticsData[];
    templates: Template[];
  }> {
    try {
      const [tasks, aiConfig, workSchedule, analytics, templates] = await Promise.all([
        this.getAllTasks(),
        this.getAIConfig(),
        this.getWorkSchedule(),
        this.getAnalyticsData(),
        this.getAllTemplates()
      ]);

      return {
        tasks,
        aiConfig,
        workSchedule,
        analytics,
        templates
      };
    } catch (error) {
      console.error('【数据存储】导出数据失败:', error);
      throw new Error('导出数据失败');
    }
  }

  /**
   * 数据导入
   */
  async importData(data: {
    tasks?: Task[];
    aiConfig?: AIConfig;
    workSchedule?: WorkSchedule;
    analytics?: AnalyticsData[];
    templates?: Template[];
  }): Promise<void> {
    try {
      // 清空现有数据
      await Promise.all([
        this.tasks.clear(),
        this.aiConfig.clear(),
        this.workSchedule.clear(),
        this.analytics.clear(),
        this.templates.clear()
      ]);

      // 导入新数据
      const promises = [];
      
      if (data.tasks) {
        promises.push(this.tasks.bulkAdd(data.tasks));
      }
      
      if (data.aiConfig) {
        promises.push(this.aiConfig.add(data.aiConfig));
      }
      
      if (data.workSchedule) {
        promises.push(this.workSchedule.add(data.workSchedule));
      }
      
      if (data.analytics) {
        promises.push(this.analytics.bulkAdd(data.analytics));
      }
      
      if (data.templates) {
        promises.push(this.templates.bulkAdd(data.templates));
      }

      await Promise.all(promises);
    } catch (error) {
      console.error('【数据存储】导入数据失败:', error);
      throw new Error('导入数据失败');
    }
  }

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

/**
 * 数据库实例
 */
export const db = new AlignDatabase();

/**
 * 数据库工具函数
 */
export const databaseUtils = {
  /**
   * 清理过期数据
   */
  async cleanupOldData(daysToKeep: number = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);
      
      // 删除过期的已完成任务
      await db.tasks
        .where('completedAt')
        .below(cutoffDate)
        .and(task => task.status === 'completed')
        .delete();
      
      // 删除过期的分析数据
      await db.analytics
        .where('date')
        .below(cutoffDate.toISOString().split('T')[0])
        .delete();
      
      console.log(`【数据存储】清理了${daysToKeep}天前的过期数据`);
    } catch (error) {
      console.error('【数据存储】清理过期数据失败:', error);
    }
  },

  /**
   * 获取数据库统计信息
   */
  async getDatabaseStats(): Promise<{
    tasks: number;
    aiConfig: boolean;
    workSchedule: boolean;
    analytics: number;
    templates: number;
    totalSize: string;
  }> {
    try {
      const [tasks, aiConfig, workSchedule, analytics, templates] = await Promise.all([
        db.tasks.count(),
        db.aiConfig.count(),
        db.workSchedule.count(),
        db.analytics.count(),
        db.templates.count()
      ]);

      return {
        tasks,
        aiConfig: aiConfig > 0,
        workSchedule: workSchedule > 0,
        analytics,
        templates,
        totalSize: '未知' // IndexedDB 不提供直接的存储大小信息
      };
    } catch (error) {
      console.error('【数据存储】获取数据库统计失败:', error);
      return {
        tasks: 0,
        aiConfig: false,
        workSchedule: false,
        analytics: 0,
        templates: 0,
        totalSize: '未知'
      };
    }
  }
};