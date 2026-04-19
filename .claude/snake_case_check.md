# Snake Case API 适配检查记录

## 检查 1 (2026-04-19)
- **状态**: 发现并修复问题
- **修复内容**:
  1. `listReviews` - 修复 `namespaceId` → `namespace_id`
  2. `listReports` - 修复参数传递
  3. `createNamespace` - 修复 `displayName` → `display_name`
  4. `submitPromotion` - 修复 `sourceSkillId`, `sourceVersionId`, `targetNamespaceId` 转换
  5. `approvePromotion` - 更新返回类型为 snake_case
  6. `getTokens` - 修复 `size` → `page_size`
  7. `createToken` - 修复 `expirationMode`, `customExpiresAt` 转换
  8. `updateTokenExpiration` - 修复 `expiresAt` → `expires_at`
  9. Mock 文件 - 更新 `approvePromotion` 返回值

## 检查 2 (2026-04-20)
- **状态**: 无问题 ✓
- **检查范围**: 所有 `src/services/real/*.ts` 文件
- **结果**: 所有 API 适配已正确处理

## 检查 3 (2026-04-20)
- **状态**: 无问题 ✓
- **结果**: 连续 3 次检查通过，关闭循环

## 总结
所有前端 API 已适配 Rust 后端的 snake_case 风格：
- `skillHubV2.ts` - 完全适配
- 其他 API 文件已有字段映射或直接使用 snake_case
