# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- **Start development server**: `npm run dev` or `pnpm dev`
- **Build for production**: `npm run build` or `pnpm build`
- **Preview production build**: `npm run preview` or `pnpm preview`
- **Generate static site**: `npm run generate` or `pnpm generate`

Note: This project uses pnpm as evidenced by pnpm-lock.yaml, so prefer `pnpm` commands.

## Project Architecture

This is a **Nuxt 3** application implementing an interactive fiction/story game. The core architecture follows a simple pattern:

### Story System
- **Story data**: Centralized in `story.json` - contains all story scenes with branching narrative structure
- **Scene structure**: Each scene has `id`, `title`, `content`, and `options` array with `text` and `nextId` for branching
- **Story utility**: `app/utils/story.js` provides `getSceneById()` helper function

### Vue Components
- **StoryScene.vue**: Main scene display component that renders title, content, and choice buttons
- **index.vue**: Root page that manages current scene state and handles user choices

### Navigation Flow
The app uses a simple state-driven navigation:
1. Current scene stored in reactive ref
2. User clicks option button → emits choice event
3. Parent component finds next scene by ID and updates current scene
4. Component re-renders with new scene content

### Styling
- Uses **Nuxt UI** module (@nuxt/ui) and **Tailwind CSS**
- Custom CSS in `app/assets/css/main.css`
- Scoped component styles for scene layout

### File Structure Notes
- Story content is in Chinese, implementing a sci-fi narrative about ice beings vs humans
- Static assets in `public/` folder
- No complex routing - single page application with state-based scene switching