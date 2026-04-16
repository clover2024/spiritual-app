# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"橄榄山" (Olive Mount) is a Chinese-language spiritual content app built with **Vue 3 + Ionic 8 + TypeScript**. It delivers videos, hymns/audio, books, daily Bible readings, gospel articles, and a donation page. The app targets three platforms: web (primary, runs in WeChat WebView), Android (via Capacitor), and macOS desktop (via Tauri 2).

All media content is hosted on **Tencent Cloud Object Storage (COS)** — there is no backend API server. The app fetches manifest JSON files from COS to discover available content.

## Commands

```bash
# Development (starts Tauri dev server)
npm run dev

# Type-check + build for web
npm run build

# Lint
npm run lint

# Unit tests (Vitest, jsdom environment)
npm run test:unit

# E2E tests (Cypress)
npm run test:e2e

# Build macOS DMG (requires Rust toolchain)
npm run tauri:build

# Sync web build to Android project
npx cap sync android
```

### Content Management Scripts

```bash
# Sync manifests between local manifests/ dir and COS
node scripts/manifest.mjs push gospel    # push gospel-manifest.json to COS
node scripts/manifest.mjs pull main      # pull manifest.json from COS
node scripts/manifest.mjs push all       # push both

# Upload content to COS
node scripts/upload-video.mjs
node scripts/upload-gospel-article.mjs
node scripts/build-daily-bible.mjs
```

Scripts require `COS_SECRET_ID` and `COS_SECRET_KEY` in `.env` or environment.

## Environment Setup

Copy `.env.example` to `.env` and configure:
- `VITE_COS_BUCKET` / `VITE_COS_REGION` — COS bucket for content (or use `VITE_COS_BASE_URL` directly)
- `VITE_WX_SIGN_URL` — WeChat JS-SDK signing endpoint URL
- `COS_SECRET_ID` / `COS_SECRET_KEY` — COS credentials (for scripts only)

## Architecture

### Data Flow

All content flows from COS manifests → service layer (`src/services/cos.ts`) → Vue components. The service layer implements module-level in-memory caching with TTL (5 min for manifests, 30 min for daily Bible).

### Routing

Uses **hash-based history** (`createWebHashHistory`) for WeChat WebView compatibility. Tab routes live under `/tabs/` and share an Ionic tab bar. Detail routes (`/video/:id`, `/book/:id`, etc.) are outside the tab structure and use the custom `<BottomNav>` component for navigation.

### State Management

No centralized store (no Pinia/Vuex). State lives in:
- **Component-local state** — `ref()`/`computed()` per view, fetched on mount
- **localStorage** — playback progress for videos, audio, and PDFs (keys like `video-progress:{id}`)
- **Service-layer cache** — in-memory TTL cache in `cos.ts`

### Key Service: `src/services/cos.ts`

Central data access layer. Fetches `manifest.json` (videos, books, hymns) and `gospel/gospel-manifest.json` (articles) from COS. All URL fields in manifests are relative and resolved via `getFullUrl()`.

### Multi-Format Book Reader: `src/views/BookReaderPage.vue`

Supports three formats: PDF (pdfjs-dist), EPUB (epubjs), and Markdown (marked). Reading progress is persisted in localStorage per book ID.

### WeChat Integration

- `src/composables/useWxShare.ts` — Configures WeChat JS-SDK for share previews
- `src/composables/usePageMeta.ts` — Sets document title and Open Graph meta tags
- `api/wx-sign.js` — Serverless function for WeChat signature generation
- `server/wx-sign/index.cjs` — Standalone Node.js HTTP server for the same purpose

### Platform Targets

- **Web**: Vite builds to `dist/` with relative paths (`base: './'`), legacy plugin for older WebViews
- **Android**: Capacitor 8 (app ID `com.spiritual.app`), sync with `npx cap sync android`
- **macOS**: Tauri 2 with Rust backend (`src-tauri/`), 1200x800 window, DMG output

### Type Definitions

All TypeScript interfaces are in `src/types/index.ts`: `VideoItem`, `BookItem`, `HymnItem`, `DailyBibleDay`, `DailyBibleMonth`, `GospelArticle`, `GospelFolder`, `Manifest`.

## Conventions

- Vue SFCs use `<script setup lang="ts">` (Composition API)
- Path alias: `@` maps to `./src` (configured in both `vite.config.ts` and `tsconfig.json`)
- All user-facing text is in Chinese
- ESLint config allows `any` types and deprecated slot attributes
- Existing tests are stale Ionic template scaffolding and do not test current features
