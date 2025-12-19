# SyncSeeker V2

<img src="./public/logos/skyline-logo.png" style="width: 330px" />
<img src="./public/logos/sync-seeker-logo.png" style="width: 330px" />

**SyncSeeker V2** 是一个基于 Web 技术构建的实时模拟飞行航班追踪与可视化平台。作为 SKYline Flyleague 的下一代连飞服务器地图系统，SyncSeeker V2 提供实时的机组、管制员位置显示，3D 航迹可视化，机场流量统计以及气象雷达等丰富功能。

本项目采用 React、Tauri 和 Mapbox GL JS 等现代 Web 技术栈全面重构，支持 PWA 部署和跨平台原生应用，为模拟飞行爱好者提供专业、流畅的连飞追踪体验。

开发与测试环境用的是SKYline Dynamic Server (golang edition, latest)，理论上支持目前市面上全部同输出格式的FSD(session与FlightObject格式)

## 特性

- **实时数据展示** - 支持 FSD 格式的实时飞行数据，显示在线机组、管制员位置和状态
- **3D 航迹可视化** - 3D 航迹展示系统，可视化飞行轨迹和高度变化
- **机场流量显示** - 实时展示机场进出港流量、当前在线飞机数量等统计信息
- **机场大屏模式** - 专为机场设计的全屏展示模式，显示航班动态和天气信息
- **气象雷达图层** - 集成 RainViewer 气象雷达数据，实时显示降水和云层信息
- **航班追踪分享** - 支持生成航班追踪链接，方便分享给其他用户
- **暗色/亮色主题** - 支持系统主题适配和手动切换
- **跨平台支持** - 支持 Web PWA，借助Tauri实现桌面端（Windows, macOS, Linux）与移动端(iOS, Android) APP

## 技术栈

### 前端核心

- **React 19** - UI 框架
- **TypeScript** - 类型安全的开发体验
- **Vite** - 快速的构建工具
- **Zustand** - 轻量级状态管理

### 地图与可视化

- **Mapbox GL JS** - 高性能的 WebGL 地图渲染引擎
- **Three.js** - 3D 航迹可视化
- **Turf.js** - 地理空间计算

### UI 组件

- **MUI (Material-UI)** - Material Design 组件库
- **IconPark** - 开源图标库
- **Recharts** - 数据图表库

### 跨平台

- **Tauri 2** - 跨平台桌面应用框架
- **PWA** - 渐进式 Web 应用支持

### 样式

- **Sass** - CSS 预处理器
- **CSS Modules** - 模块化样式管理

## 快速开始

### 前置要求

- Node.js 18 或更高版本
- npm
- Rust 和 Tauri CLI（仅用于构建桌面应用）

### 安装依赖

```bash
npm install
```

### 开发模式

#### Web 开发

```bash
npm run dev
```

#### Tauri 开发（桌面应用）

```bash
npm run tauri dev
```

### 环境变量

在项目根目录创建 `.env` 文件，配置以下环境变量：

```env
# FSD 服务器 API 地址
VITE_API_BASE_URL=https://your-fsd-server.com/api

# 导航数据 CDN 地址
VITE_PUBLIC_NAVDATA_URL=https://your-cdn.com/navdata

# Mapbox Access Token
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_token

# 联系邮箱
VITE_CONTACT_EMAIL=your-email@example.com
```

### 构建

#### 构建 Web 应用

```bash
npm run build
```

构建产物位于 `dist/` 目录。

#### 构建 Tauri 应用

```bash
npm run tauri build
```

构建产物位于 `src-tauri/target/release/` 目录。

## 数据格式

SyncSeeker V2 支持标准的 FSD 格式，包括：

- Session 格式 - 机组和管制员会话信息
- FlightObject 格式 - 飞行对象详细数据

## 贡献指南

我们欢迎任何形式的贡献，包括但不限于：

- 报告 Bug
- 提出新功能建议
- 提交代码修复或新功能
- 改进文档

### 贡献流程

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建 Pull Request

### 代码规范

- 遵循项目的 ESLint 配置
- 使用 TypeScript 编写类型安全的代码
- 组件和函数添加必要的注释
- 提交信息使用清晰的描述

### 问题反馈

如果您发现 Bug 或有功能建议，请在 [Issues](https://github.com/star-reader/SyncSeeker_V2/issues) 页面创建新的 issue。

## 许可证

本项目采用 **GPL3.0** 许可证。详见 [LICENSE](LICENSE) 文件。

## 相关项目

- **SKY-Aware** - 更个性化的跨平台原生连飞服务器追踪系统（个人项目，开发中）

## 致谢

感谢所有为本项目做出贡献的开发者和开源社区。特别感谢：

- React 团队及社区
- Mapbox 提供的强大地图引擎
- Tauri 团队的跨平台框架
- 所有使用和支持 SyncSeeker 的模拟飞行爱好者

## 联系我们

- GitHub: [star-reader/SyncSeeker_V2](https://github.com/star-reader/SyncSeeker_V2)
- 开发团队: SKYline Technical Team

---

**SyncSeeker V2** - 让每一次飞行都值得追踪
