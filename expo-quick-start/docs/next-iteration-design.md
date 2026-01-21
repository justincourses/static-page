# 下一轮迭代设计文档（Expo Quick Start）

## 背景与目的
当前实现功能完整，但在平台分支、图标体系、安全区域处理、以及 web-only 依赖隔离上与 Expo/React 最佳实践存在偏差。此迭代目标是优化跨端一致性、可维护性和包体体积，同时避免引入大范围重构风险。

## 目标
- 统一平台判断方式，减少条件分支差异与不可预期的渲染行为。
- 规范图标体系，降低包体积并简化跨端映射。
- 完善安全区域与滚动容器策略，提升小屏与刘海屏体验。
- 隔离 web-only 依赖，避免对原生包体/运行时造成负担。
- 修复 TabBar 样式被覆盖的潜在问题。

## 非目标
- 不调整视觉风格与配色体系。
- 不引入新的状态管理或数据层方案。
- 不改动核心业务流程（贴纸选择/保存）。

## 关键问题（现状）
- 多处使用 `Platform.OS/Platform.select`，与 Expo 推荐的 `process.env.EXPO_OS` 不一致。
- 多处直接依赖 `@expo/vector-icons`，与 `expo-symbols` 优先策略不一致。
- ScrollView/页面根容器缺少 `contentInsetAdjustmentBehavior="automatic"`，存在安全区域遮挡风险。
- `dom-to-image` 在顶层 import，影响原生包体与潜在运行时稳定性。
- `tabBarStyle` 在弹层关闭后可能被重置为 undefined，导致 TabBar 样式丢失。

## 方案概览
1) **平台判断统一**
   - 使用 `process.env.EXPO_OS` 替代 `Platform.OS` / `Platform.select`。
   - 复杂分支可拆为 `.web.tsx` / `.native.tsx` 文件。

2) **图标体系收敛**
   - 优先使用 `expo-symbols`（iOS）+ 映射策略或自定义 SVG/图片。
   - 将现有 `@expo/vector-icons` 逐步替换为 `IconSymbol` 或统一封装组件。

3) **安全区域与滚动策略**
   - 需要滚动的页面/容器默认使用 `ScrollView`，并设置 `contentInsetAdjustmentBehavior="automatic"`。
   - `ParallaxScrollView` 内部统一补齐该属性。

4) **Web-only 依赖隔离**
   - 将 `dom-to-image` 调整为动态 import（仅在 web 分支执行）。
   - 或通过 `.web.tsx` 专用实现规避原生 bundle 引入。

5) **TabBar 样式恢复策略**
   - 将 TabBar 的默认样式保存为常量/闭包变量。
   - 当弹层关闭时显式恢复默认样式，避免 `undefined` 覆盖。

## 受影响文件
- `app/(tabs)/index.tsx`
- `app/(tabs)/_layout.tsx`
- `app/(tabs)/explore.tsx`
- `components/StickerSheet.tsx`
- `components/Button.tsx`
- `components/IconButton.tsx`
- `components/CircleButton.tsx`
- `components/ui/icon-symbol.tsx`
- `components/parallax-scroll-view.tsx`
- `constants/theme.ts`

## 迭代步骤（建议顺序）
1) 统一平台判断与分支（`process.env.EXPO_OS`/平台文件）。
2) 替换核心图标（按钮、层级操作、Tab）。
3) 修复 TabBar 样式恢复逻辑。
4) ScrollView 安全区域补齐。
5) web-only 依赖动态加载与打包隔离。
6) 补充回归自测（iOS/Android/Web 三端检查）。

## 验收标准
- iOS/Android/Web 三端功能一致，无安全区域遮挡。
- TabBar 在弹层打开/关闭后样式保持一致。
- 原生端 bundle 中不包含 `dom-to-image` 相关代码。
- 图标在三端显示一致且无 fallback 错误。

## 风险与回滚
- 图标替换可能导致个别平台不匹配或缺失，需保留旧实现的回滚入口。
- 平台条件分支重构需逐步替换，避免一次性改动引入回归。
