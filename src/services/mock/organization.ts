/**
 * Organization mock data and API
 */

// User types
export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  department: string;
  role: 'admin' | 'manager' | 'user';
  status: 'active' | 'inactive' | 'pending';
  createdAt: Date;
  lastLoginAt?: Date;
  usage: {
    totalConversations: number;
    totalTokens: number;
  };
}

// Department types
export interface Department {
  id: string;
  name: string;
  parentId?: string;
  manager?: string;
  memberCount: number;
  description?: string;
  createdAt: Date;
}

// Mock user data
const mockUsers: User[] = [
  {
    id: 'user-1',
    name: '张三',
    email: 'zhangsan@example.com',
    department: '技术部',
    role: 'admin',
    status: 'active',
    createdAt: new Date('2025-01-01'),
    lastLoginAt: new Date(),
    usage: { totalConversations: 234, totalTokens: 1250000 },
  },
  {
    id: 'user-2',
    name: '李四',
    email: 'lisi@example.com',
    department: '技术部',
    role: 'user',
    status: 'active',
    createdAt: new Date('2025-02-15'),
    lastLoginAt: new Date(Date.now() - 86400000),
    usage: { totalConversations: 156, totalTokens: 890000 },
  },
  {
    id: 'user-3',
    name: '王五',
    email: 'wangwu@example.com',
    department: '产品部',
    role: 'manager',
    status: 'active',
    createdAt: new Date('2025-03-01'),
    lastLoginAt: new Date(Date.now() - 3600000),
    usage: { totalConversations: 89, totalTokens: 450000 },
  },
  {
    id: 'user-4',
    name: '赵六',
    email: 'zhaoliu@example.com',
    department: '运营部',
    role: 'user',
    status: 'active',
    createdAt: new Date('2025-03-10'),
    lastLoginAt: new Date(Date.now() - 172800000),
    usage: { totalConversations: 67, totalTokens: 320000 },
  },
  {
    id: 'user-5',
    name: '钱七',
    email: 'qianqi@example.com',
    department: '市场部',
    role: 'user',
    status: 'inactive',
    createdAt: new Date('2025-01-20'),
    lastLoginAt: new Date(Date.now() - 604800000),
    usage: { totalConversations: 45, totalTokens: 180000 },
  },
  {
    id: 'user-6',
    name: '孙八',
    email: 'sunba@example.com',
    department: '技术部',
    role: 'user',
    status: 'active',
    createdAt: new Date('2025-04-01'),
    lastLoginAt: new Date(Date.now() - 7200000),
    usage: { totalConversations: 123, totalTokens: 670000 },
  },
  {
    id: 'user-7',
    name: '周九',
    email: 'zhoujiu@example.com',
    department: '产品部',
    role: 'user',
    status: 'pending',
    createdAt: new Date('2026-03-10'),
    usage: { totalConversations: 0, totalTokens: 0 },
  },
  {
    id: 'user-8',
    name: '吴十',
    email: 'wushi@example.com',
    department: '运营部',
    role: 'user',
    status: 'active',
    createdAt: new Date('2025-05-15'),
    lastLoginAt: new Date(Date.now() - 86400000),
    usage: { totalConversations: 78, totalTokens: 390000 },
  },
];

// Mock department data
const mockDepartments: Department[] = [
  {
    id: 'dept-1',
    name: '技术部',
    manager: '张三',
    memberCount: 15,
    description: '负责产品技术研发和维护',
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'dept-2',
    name: '产品部',
    manager: '王五',
    memberCount: 8,
    description: '负责产品规划和设计',
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'dept-3',
    name: '运营部',
    memberCount: 12,
    description: '负责产品运营和用户增长',
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'dept-4',
    name: '市场部',
    memberCount: 6,
    description: '负责市场推广和品牌建设',
    createdAt: new Date('2025-02-01'),
  },
  {
    id: 'dept-5',
    name: '人力资源部',
    memberCount: 4,
    description: '负责人才招聘和员工发展',
    createdAt: new Date('2025-01-01'),
  },
  {
    id: 'dept-6',
    name: '财务部',
    memberCount: 3,
    description: '负责财务管理和成本控制',
    createdAt: new Date('2025-01-01'),
  },
];

// Simulated latency
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Organization API Mock
export const organizationApi = {
  // ===== User management =====

  // Get all users
  async getUsers(filter?: { department?: string; status?: string; role?: string }): Promise<User[]> {
    await delay(300);
    let users = [...mockUsers];

    if (filter?.department) {
      users = users.filter((u) => u.department === filter.department);
    }
    if (filter?.status) {
      users = users.filter((u) => u.status === filter.status);
    }
    if (filter?.role) {
      users = users.filter((u) => u.role === filter.role);
    }

    return users;
  },

  // Get a single user
  async getUser(id: string): Promise<User | undefined> {
    await delay(200);
    return mockUsers.find((u) => u.id === id);
  },

  // Create user
  async createUser(data: Partial<User>): Promise<User> {
    await delay(500);
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: data.name || '新用户',
      email: data.email || '',
      department: data.department || '',
      role: data.role || 'user',
      status: 'pending',
      createdAt: new Date(),
      usage: { totalConversations: 0, totalTokens: 0 },
    };
    mockUsers.push(newUser);
    return newUser;
  },

  // Update user
  async updateUser(id: string, data: Partial<User>): Promise<User | undefined> {
    await delay(300);
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) return undefined;
    mockUsers[index] = { ...mockUsers[index], ...data };
    return mockUsers[index];
  },

  // Delete user
  async deleteUser(id: string): Promise<boolean> {
    await delay(300);
    const index = mockUsers.findIndex((u) => u.id === id);
    if (index === -1) return false;
    mockUsers.splice(index, 1);
    return true;
  },

  // Batch update user status
  async batchUpdateStatus(userIds: string[], status: User['status']): Promise<boolean> {
    await delay(400);
    userIds.forEach((id) => {
      const user = mockUsers.find((u) => u.id === id);
      if (user) {
        user.status = status;
      }
    });
    return true;
  },

  // ===== Department management =====

  // Get all departments
  async getDepartments(): Promise<Department[]> {
    await delay(300);
    return [...mockDepartments];
  },

  // Get a single department
  async getDepartment(id: string): Promise<Department | undefined> {
    await delay(200);
    return mockDepartments.find((d) => d.id === id);
  },

  // Create department
  async createDepartment(data: Partial<Department>): Promise<Department> {
    await delay(500);
    const newDept: Department = {
      id: `dept-${Date.now()}`,
      name: data.name || '新部门',
      parentId: data.parentId,
      manager: data.manager,
      memberCount: 0,
      description: data.description,
      createdAt: new Date(),
    };
    mockDepartments.push(newDept);
    return newDept;
  },

  // Update department
  async updateDepartment(id: string, data: Partial<Department>): Promise<Department | undefined> {
    await delay(300);
    const index = mockDepartments.findIndex((d) => d.id === id);
    if (index === -1) return undefined;
    mockDepartments[index] = { ...mockDepartments[index], ...data };
    return mockDepartments[index];
  },

  // Delete department
  async deleteDepartment(id: string): Promise<boolean> {
    await delay(300);
    const index = mockDepartments.findIndex((d) => d.id === id);
    if (index === -1) return false;
    mockDepartments.splice(index, 1);
    return true;
  },

  // Get department members
  async getDepartmentMembers(departmentId: string): Promise<User[]> {
    await delay(200);
    const dept = mockDepartments.find((d) => d.id === departmentId);
    if (!dept) return [];
    return mockUsers.filter((u) => u.department === dept.name);
  },

  // Get department statistics
  async getDepartmentStats(): Promise<{ department: string; users: number; conversations: number; tokens: number }[]> {
    await delay(200);
    const stats = new Map<string, { users: number; conversations: number; tokens: number }>();

    mockUsers.forEach((user) => {
      const dept = stats.get(user.department) || { users: 0, conversations: 0, tokens: 0 };
      dept.users += 1;
      dept.conversations += user.usage.totalConversations;
      dept.tokens += user.usage.totalTokens;
      stats.set(user.department, dept);
    });

    return Array.from(stats.entries()).map(([department, data]) => ({
      department,
      ...data,
    }));
  },
};
