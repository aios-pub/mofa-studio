/**
 * 系统管理相关类型定义
 */

/** 基础状态 */
export enum BasicStatus {
  DISABLE = 0,
  ENABLE = 1,
}

/** 菜单类型 */
export enum MenuType {
  CATALOGUE = 0, // 目录
  MENU = 1, // 菜单
  BUTTON = 2, // 按钮
}

/** 菜单项 */
export interface MenuItem {
  id: string;
  parentId: string | null;
  name: string;
  label: string;
  path?: string;
  component?: string;
  icon?: string;
  type: MenuType;
  order: number;
  status: BasicStatus;
  hide?: boolean;
  externalLink?: string;
  description?: string;
  children?: MenuItem[];
  createdAt: Date;
  updatedAt: Date;
}

/** 角色项 */
export interface SystemRole {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: BasicStatus;
  order: number;
  permissions: string[]; // 权限ID列表
  menus: string[]; // 菜单ID列表
  createdAt: Date;
  updatedAt: Date;
}

/** 角色创建/编辑表单 */
export interface RoleFormData {
  id?: string;
  name: string;
  code: string;
  description?: string;
  status: BasicStatus;
  order: number;
  permissions: string[];
  menus: string[];
}

/** 菜单创建/编辑表单 */
export interface MenuFormData {
  id?: string;
  parentId: string | null;
  name: string;
  label: string;
  path?: string;
  component?: string;
  icon?: string;
  type: MenuType;
  order: number;
  status: BasicStatus;
  hide?: boolean;
  externalLink?: string;
  description?: string;
}
