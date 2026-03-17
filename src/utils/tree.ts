/**
 * 树形数据处理工具
 */

/**
 * 扁平化树结构
 * @param trees 树结构数组
 * @returns 扁平化后的数组
 */
export function flattenTrees<T extends { children?: T[] }>(
  trees: T[] = [],
): T[] {
  const result: T[] = [];

  for (const node of trees) {
    result.push(node);
    if (node.children && node.children.length > 0) {
      result.push(...flattenTrees(node.children));
    }
  }

  return result;
}

/**
 * 转换数组为树结构（深拷贝）
 * @param items 带有 children 的数组
 * @returns 树结构
 */
export function convertToTree<T extends { children?: T[] }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    children: item.children ? convertToTree(item.children) : [],
  }));
}

/**
 * 扁平数组转树结构
 * @param items 带有 id 和 parentId 的扁平数组
 * @returns 树结构（包含 children 属性）
 */
export function convertFlatToTree<T extends { id: string; parentId: string }>(
  items: T[],
): (T & { children: (T & { children: T[] })[] })[] {
  const itemMap = new Map<
    string,
    T & { children: (T & { children: T[] })[] }
  >();
  const result: (T & { children: (T & { children: T[] })[] })[] = [];

  // 第一遍：创建所有节点的映射
  for (const item of items) {
    itemMap.set(item.id, { ...item, children: [] });
  }

  // 第二遍：构建树结构
  for (const item of items) {
    const node = itemMap.get(item.id);
    if (!node) continue;

    if (!item.parentId || item.parentId === "") {
      // 根节点
      result.push(node);
    } else {
      // 子节点
      const parent = itemMap.get(item.parentId);
      if (parent) {
        parent.children.push(node as any);
      }
    }
  }

  return result;
}

/**
 * 在树中查找节点
 * @param trees 树结构数组
 * @param predicate 查找条件
 * @returns 找到的节点或 undefined
 */
export function findInTree<T extends { children?: T[] }>(
  trees: T[],
  predicate: (node: T) => boolean,
): T | undefined {
  for (const node of trees) {
    if (predicate(node)) {
      return node;
    }
    if (node.children) {
      const found = findInTree(node.children, predicate);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * 在树中查找所有匹配的节点
 * @param trees 树结构数组
 * @param predicate 查找条件
 * @returns 所有匹配的节点
 */
export function findAllInTree<T extends { children?: T[] }>(
  trees: T[],
  predicate: (node: T) => boolean,
): T[] {
  const result: T[] = [];

  for (const node of trees) {
    if (predicate(node)) {
      result.push(node);
    }
    if (node.children) {
      result.push(...findAllInTree(node.children, predicate));
    }
  }

  return result;
}

/**
 * 遍历树
 * @param trees 树结构数组
 * @param callback 回调函数
 */
export function traverseTree<T extends { children?: T[] }>(
  trees: T[],
  callback: (node: T, depth: number, parent: T | null) => void,
  depth = 0,
  parent: T | null = null,
): void {
  for (const node of trees) {
    callback(node, depth, parent);
    if (node.children) {
      traverseTree(node.children, callback, depth + 1, node);
    }
  }
}

/**
 * 过滤树（保留匹配的节点及其父节点路径）
 * @param trees 树结构数组
 * @param predicate 过滤条件
 * @returns 过滤后的树
 */
export function filterTree<T extends { children?: T[] }>(
  trees: T[],
  predicate: (node: T) => boolean,
): T[] {
  const result: T[] = [];

  for (const node of trees) {
    if (predicate(node)) {
      result.push({
        ...node,
        children: node.children
          ? filterTree(node.children, predicate)
          : undefined,
      } as T);
    } else if (node.children) {
      const filteredChildren = filterTree(node.children, predicate);
      if (filteredChildren.length > 0) {
        result.push({
          ...node,
          children: filteredChildren,
        } as T);
      }
    }
  }

  return result;
}

/**
 * 获取节点的路径
 * @param trees 树结构数组
 * @param targetId 目标节点 ID
 * @param idKey ID 属性名
 * @returns 从根到目标节点的路径
 */
export function getTreePath<T extends { children?: T[] }>(
  trees: T[],
  targetId: string,
  idKey: keyof T = "id" as keyof T,
): T[] {
  const path: T[] = [];

  function findPath(nodes: T[]): boolean {
    for (const node of nodes) {
      path.push(node);

      if (String((node as any)[idKey]) === targetId) {
        return true;
      }

      if (node.children && findPath(node.children)) {
        return true;
      }

      path.pop();
    }
    return false;
  }

  findPath(trees);
  return path;
}

export default {
  flattenTrees,
  convertToTree,
  convertFlatToTree,
  findInTree,
  findAllInTree,
  traverseTree,
  filterTree,
  getTreePath,
};
