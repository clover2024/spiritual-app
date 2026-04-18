# 橄榄山 (Olive Mount)

中文属灵内容应用，基于 Vue 3 + Ionic 8 + TypeScript 构建，支持 Web（微信 WebView）、Android（Capacitor）和 macOS 桌面（Tauri 2）三个平台。

所有媒体内容托管在腾讯云 COS 上，无后端 API 服务器。应用通过拉取 COS 上的 manifest JSON 文件来发现和展示内容。

## 功能模块

| Tab | 功能 | 说明 |
|-----|------|------|
| 视频 | 视频列表与播放 | 支持播放进度记忆 |
| 音频 | 生命诗歌 / 生命读经 | 790 首诗歌（12 分类）+ 1955 篇读经音频（新约/旧约） |
| 文字室 | 属灵文章阅读 | 支持 Markdown 渲染、搜索、同类推荐 |
| 书报 | 多格式阅读器 | 支持 PDF、EPUB、Markdown，阅读进度持久化 |
| 日日行 | 每日读经 | 按月/日索引，含音频 |
| 赞赏 | 支持页面 | 微信赞赏码 |

## 技术栈

- **前端**: Vue 3 (Composition API) + Ionic 8 + TypeScript
- **路由**: Vue Router + Hash History（兼容微信 WebView）
- **构建**: Vite + @vitejs/plugin-legacy（兼容旧版 WebView）
- **桌面端**: Tauri 2 (Rust)
- **移动端**: Capacitor 8 (Android)
- **存储**: 腾讯云 COS (内容分发) + localStorage (播放进度)
- **微信集成**: JS-SDK 签名 + 分享预览配置

## 项目结构

```
├── src/
│   ├── views/          # 页面组件（17 个）
│   ├── components/     # 公共组件 (BottomNav 等)
│   ├── composables/    # 组合式函数 (useWxShare, usePageMeta)
│   ├── services/       # 数据层 (cos.ts - COS manifest 获取与缓存)
│   ├── types/          # TypeScript 类型定义
│   └── router/         # 路由配置
├── manifests/          # 本地 manifest 文件
│   ├── gospel-manifest.json
│   ├── life-study-manifest.json
│   └── lifesongs-manifest.json
├── docs/wzs/           # 文字室文章源文件 (Markdown)
├── scripts/            # 内容管理脚本
├── src-tauri/          # Tauri 2 配置 (Rust)
├── android/            # Capacitor Android 项目
└── api/                # 云函数 (微信签名)
```

## 开始使用

### 环境要求

- Node.js >= 18
- Rust 工具链（仅 macOS 桌面端构建需要）

### 安装

```bash
npm install
```

### 配置

复制 `.env.example` 到 `.env` 并填写：

```bash
cp .env.example .env
```

```env
# COS 配置（二选一）
VITE_COS_BUCKET=your-bucket-name
VITE_COS_REGION=ap-guangzhou
# 或直接配置完整 URL
VITE_COS_BASE_URL=https://your-bucket-name.cos.ap-guangzhou.myqcloud.com

# 脚本用 COS 凭证
COS_SECRET_ID=your-secret-id
COS_SECRET_KEY=your-secret-key

# 微信 JS-SDK 签名端点
VITE_WX_SIGN_URL=https://your-sign-url/wx-sign
```

### 开发

```bash
# 启动 Tauri 开发服务器
npm run dev

# 类型检查 + Web 构建
npm run build

# 代码检查
npm run lint
```

### 构建产物

```bash
# 构建 macOS DMG
npm run tauri:build

# 同步到 Android 项目
npx cap sync android
```

## 内容管理脚本

```bash
# Manifest 同步
node scripts/manifest.mjs push gospel      # 推送文字室 manifest
node scripts/manifest.mjs push lifesongs   # 推送生命诗歌 manifest
node scripts/manifest.mjs push life-study  # 推送生命读经 manifest
node scripts/manifest.mjs push all         # 推送全部

# 内容生成
node scripts/scan-lifesongs.mjs            # 从 HTML + COS 生成生命诗歌 manifest
node scripts/scan-lifesongs.mjs --push     # 生成并推送到 COS
node scripts/scan-life-study.mjs           # 从 COS 扫描生成生命读经 manifest
node scripts/build-daily-bible.mjs         # 构建每日读经数据

# 内容上传
node scripts/upload-video.mjs             # 上传视频
node scripts/upload-gospel-article.mjs    # 上传文字室文章
```

脚本需要 `.env` 中配置 `COS_SECRET_ID` 和 `COS_SECRET_KEY`。

## 数据架构

每个内容模块使用独立的 manifest 文件，由 `src/services/cos.ts` 统一管理获取与缓存（5 分钟 TTL）：

| Manifest | COS 路径 | 内容 |
|----------|----------|------|
| 主 manifest | `/manifest.json` | 视频、书报、每日读经 |
| 福音 manifest | `/gospel/gospel-manifest.json` | 文字室文章 |
| 生命诗歌 manifest | `/lifesongs/lifesongs-manifest.json` | 790 首诗歌 |
| 生命读经 manifest | `/life-study/life-study-manifest.json` | 1955 篇读经 |

Manifest 中的 URL 字段为相对路径，由服务层通过 `getFullUrl()` 拼接 COS 域名。

## License

Private
