/**
 * System management mock API
 */

import { BasicStatus, MenuType, type MenuItem, type SystemRole, type RoleFormData, type MenuFormData } from '../../types/system';

// Simulated latency
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// ==================== Menu data ====================
const mockMenus: MenuItem[] = [
  {
    id: 'menu-1',
    parentId: null,
    name: 'workbench',
    label: '工作台',
    path: '/workbench',
    icon: 'DashboardOutlined',
    type: MenuType.MENU,
    order: 1,
    status: BasicStatus.ENABLE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'menu-2',
    parentId: null,
    name: 'management',
    label: '系统管理',
    path: '/management',
    icon: 'SettingOutlined',
    type: MenuType.CATALOGUE,
    order: 2,
    status: BasicStatus.ENABLE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    children: [
      {
        id: 'menu-2-1',
        parentId: 'menu-2',
        name: 'agents',
        label: 'Agent 管理',
        path: '/management/agents',
        icon: 'RobotOutlined',
        type: MenuType.MENU,
        order: 1,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'menu-2-2',
        parentId: 'menu-2',
        name: 'prompts',
        label: '提示词管理',
        path: '/management/prompts',
        icon: 'FileTextOutlined',
        type: MenuType.MENU,
        order: 2,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'menu-2-3',
        parentId: 'menu-2',
        name: 'skills',
        label: '技能管理',
        path: '/management/skills',
        icon: 'ThunderboltOutlined',
        type: MenuType.MENU,
        order: 3,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'menu-2-4',
        parentId: 'menu-2',
        name: 'testsets',
        label: '测试集管理',
        path: '/management/test-sets',
        icon: 'ExperimentOutlined',
        type: MenuType.MENU,
        order: 4,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'menu-2-5',
        parentId: 'menu-2',
        name: 'menus',
        label: '菜单管理',
        path: '/management/menus',
        icon: 'MenuOutlined',
        type: MenuType.MENU,
        order: 5,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'menu-2-6',
        parentId: 'menu-2',
        name: 'roles',
        label: '角色管理',
        path: '/management/roles',
        icon: 'TeamOutlined',
        type: MenuType.MENU,
        order: 6,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  },
  {
    id: 'menu-3',
    parentId: null,
    name: 'organization',
    label: '组织管理',
    path: '/organization',
    icon: 'ApartmentOutlined',
    type: MenuType.CATALOGUE,
    order: 3,
    status: BasicStatus.ENABLE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    children: [
      {
        id: 'menu-3-1',
        parentId: 'menu-3',
        name: 'users',
        label: '用户管理',
        path: '/organization/users',
        icon: 'UserOutlined',
        type: MenuType.MENU,
        order: 1,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'menu-3-2',
        parentId: 'menu-3',
        name: 'departments',
        label: '部门管理',
        path: '/organization/departments',
        icon: 'HomeOutlined',
        type: MenuType.MENU,
        order: 2,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  },
  {
    id: 'menu-4',
    parentId: null,
    name: 'system',
    label: '系统设置',
    path: '/system',
    icon: 'ToolOutlined',
    type: MenuType.CATALOGUE,
    order: 4,
    status: BasicStatus.ENABLE,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    children: [
      {
        id: 'menu-4-1',
        parentId: 'menu-4',
        name: 'settings',
        label: '系统设置',
        path: '/system/settings',
        icon: 'SettingOutlined',
        type: MenuType.MENU,
        order: 1,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'menu-4-2',
        parentId: 'menu-4',
        name: 'audit-logs',
        label: '审计日志',
        path: '/system/audit-logs',
        icon: 'AuditOutlined',
        type: MenuType.MENU,
        order: 2,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'menu-4-3',
        parentId: 'menu-4',
        name: 'resources',
        label: '资源管理',
        path: '/system/resources',
        icon: 'FolderOutlined',
        type: MenuType.MENU,
        order: 3,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
      {
        id: 'menu-4-4',
        parentId: 'menu-4',
        name: 'insight',
        label: '洞察分析',
        path: '/system/insight',
        icon: 'BarChartOutlined',
        type: MenuType.MENU,
        order: 4,
        status: BasicStatus.ENABLE,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
      },
    ],
  },
];

// ==================== Role data ====================
const mockRoles: SystemRole[] = [
  {
    id: 'role-1',
    name: '超级管理员',
    code: 'super_admin',
    description: '拥有系统所有权限',
    status: BasicStatus.ENABLE,
    order: 1,
    permissions: ['all'],
    menus: ['all'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'role-2',
    name: '系统管理员',
    code: 'admin',
    description: '管理系统配置和用户',
    status: BasicStatus.ENABLE,
    order: 2,
    permissions: ['manage_users', 'manage_agents', 'manage_settings'],
    menus: ['menu-1', 'menu-2', 'menu-3', 'menu-4'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'role-3',
    name: '开发者',
    code: 'developer',
    description: '开发和测试 Agent',
    status: BasicStatus.ENABLE,
    order: 3,
    permissions: ['manage_agents', 'manage_prompts', 'manage_skills', 'manage_testsets'],
    menus: ['menu-1', 'menu-2'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'role-4',
    name: '普通用户',
    code: 'user',
    description: '使用 Agent 进行对话',
    status: BasicStatus.ENABLE,
    order: 4,
    permissions: ['use_agents', 'view_conversations'],
    menus: ['menu-1'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
  {
    id: 'role-5',
    name: '访客',
    code: 'guest',
    description: '只读访问权限',
    status: BasicStatus.DISABLE,
    order: 5,
    permissions: ['view_agents'],
    menus: ['menu-1'],
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
  },
];

// ==================== Menu API ====================
export const menuApi = {
  /** Get all menus (tree structure) */
  getAll: async (): Promise<MenuItem[]> => {
    await delay(300);
    return mockMenus;
  },

  /** Get the flattened menu list */
  getFlatList: async (): Promise<MenuItem[]> => {
    await delay(300);
    const flatten = (items: MenuItem[]): MenuItem[] => {
      return items.reduce<MenuItem[]>((acc, item) => {
        acc.push(item);
        if (item.children) {
          acc.push(...flatten(item.children));
        }
        return acc;
      }, []);
    };
    return flatten(mockMenus);
  },

  /** Get a single menu */
  getById: async (id: string): Promise<MenuItem | null> => {
    await delay(200);
    const findMenu = (items: MenuItem[]): MenuItem | null => {
      for (const item of items) {
        if (item.id === id) return item;
        if (item.children) {
          const found = findMenu(item.children);
          if (found) return found;
        }
      }
      return null;
    };
    return findMenu(mockMenus);
  },

  /** Create menu */
  create: async (data: MenuFormData): Promise<MenuItem> => {
    await delay(500);
    const newMenu: MenuItem = {
      ...data,
      id: `menu-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as MenuItem;
    return newMenu;
  },

  /** Update menu */
  update: async (id: string, data: Partial<MenuFormData>): Promise<MenuItem | null> => {
    await delay(500);
    const menu = await menuApi.getById(id);
    if (!menu) return null;
    return {
      ...menu,
      ...data,
      updatedAt: new Date(),
    };
  },

  /** Delete menu */
  delete: async (_id: string): Promise<boolean> => {
    await delay(300);
    return true;
  },
};

// ==================== Role API ====================
export const roleApi = {
  /** Get all roles */
  getAll: async (): Promise<SystemRole[]> => {
    await delay(300);
    return mockRoles;
  },

  /** Get a single role */
  getById: async (id: string): Promise<SystemRole | null> => {
    await delay(200);
    return mockRoles.find(r => r.id === id) || null;
  },

  /** Create role */
  create: async (data: RoleFormData): Promise<SystemRole> => {
    await delay(500);
    const newRole: SystemRole = {
      ...data,
      id: `role-${Date.now()}`,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return newRole;
  },

  /** Update role */
  update: async (id: string, data: Partial<RoleFormData>): Promise<SystemRole | null> => {
    await delay(500);
    const role = mockRoles.find(r => r.id === id);
    if (!role) return null;
    return {
      ...role,
      ...data,
      updatedAt: new Date(),
    };
  },

  /** Delete role */
  delete: async (_id: string): Promise<boolean> => {
    await delay(300);
    return true;
  },
};
