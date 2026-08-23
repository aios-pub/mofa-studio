/**
 * System management type definitions
 */

/** Base state */
export enum BasicStatus {
  DISABLE = 0,
  ENABLE = 1,
}

/** Menu types */
export enum MenuType {
  CATALOGUE = 0, // catalogue
  MENU = 1, // menu
  BUTTON = 2, // button
}

/** Menu items */
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

/** Role item */
export interface SystemRole {
  id: string;
  name: string;
  code: string;
  description?: string;
  status: BasicStatus;
  order: number;
  permissions: string[]; // permission ID list
  menus: string[]; // menu ID list
  createdAt: Date;
  updatedAt: Date;
}

/** Role create/edit form */
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

/** Menu create/edit form */
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
