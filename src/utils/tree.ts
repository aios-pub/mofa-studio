/**
 * Tree data utilities
 */

/**
 * Flatten tree structure
 * @param trees Array of tree structures
 * @returns Flattened array
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
 * Convert an array to a tree (deep copy)
 * @param items Array with children
 * @returns Tree structure
 */
export function convertToTree<T extends { children?: T[] }>(items: T[]): T[] {
  return items.map((item) => ({
    ...item,
    children: item.children ? convertToTree(item.children) : [],
  }));
}

/**
 * Flat array to tree
 * @param items Flat array with id and parentId
 * @returns Tree structure (with children property)
 */
export function convertFlatToTree<T extends { id: string; parentId: string }>(
  items: T[],
): (T & { children: (T & { children: T[] })[] })[] {
  const itemMap = new Map<
    string,
    T & { children: (T & { children: T[] })[] }
  >();
  const result: (T & { children: (T & { children: T[] })[] })[] = [];

  // First pass: build a map of all nodes
  for (const item of items) {
    itemMap.set(item.id, { ...item, children: [] });
  }

  // Second pass: build the tree structure
  for (const item of items) {
    const node = itemMap.get(item.id);
    if (!node) continue;

    if (!item.parentId || item.parentId === "") {
      // Root node
      result.push(node);
    } else {
      // Child nodes
      const parent = itemMap.get(item.parentId);
      if (parent) {
        parent.children.push(node as any);
      }
    }
  }

  return result;
}

/**
 * Find a node in a tree
 * @param trees Array of tree structures
 * @param predicate Find condition
 * @returns Found node or undefined
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
 * Find all matching nodes in a tree
 * @param trees Array of tree structures
 * @param predicate Find condition
 * @returns All matching nodes
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
 * Traverse a tree
 * @param trees Array of tree structures
 * @param callback Callback function
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
 * Filter a tree (keep matching nodes and their ancestor paths)
 * @param trees Array of tree structures
 * @param predicate Filter condition
 * @returns Filtered tree
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
 * Get the node's path
 * @param trees Array of tree structures
 * @param targetId Target node ID
 * @param idKey ID property name
 * @returns Path from root to target node
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
