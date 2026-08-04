# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # Start Vite dev server
npm run build        # TypeScript check + Vite production build
npm run lint         # ESLint (flat config, TS/TSX only)
npm run preview      # Preview production build
```

## Architecture

**Rapid Mail** is an email campaign management app. This is the **frontend** — a React 19 + TypeScript SPA built with Vite.

### Stack
- **UI**: Tailwind CSS v4 (via `@tailwindcss/vite` plugin), shadcn/ui components (Radix primitives in `src/components/ui/`), Lucide icons, MUI (selective use)
- **State**: Redux Toolkit — store at `src/app/store.tsx`, typed hooks in `src/app/hook.tsx`
- **Routing**: React Router v7 with `ProtectedRoute` wrapper for auth-gated pages
- **API**: Axios with interceptors (`src/interceptors/index.tsx`) — base URL from `VITE_BASE_URL`, all API calls go through `/v1` prefix
- **Auth**: Google OAuth (`@react-oauth/google`) code flow. JWT tokens stored in localStorage (`access_token`, `refresh_token`). Auto-refresh on 401 via Axios response interceptor.
- **Validation**: Yup schemas in `src/schema/`
- **Rich text**: Quill editor + legacy Trumbow editor (`src/components/editor/`)

### Key Patterns
- **Path alias**: `@` maps to `src/` (configured in `vite.config.ts` and `tsconfig.app.json`)
- **API layer**: Feature APIs use `createAsyncThunk` + `sendRequest()` utility (`src/utils/sendRequest.ts`) which wraps the Axios instance
- **Feature slices**: `src/features/{domain}/` — each domain has an API file (`*Api.tsx`) and optionally a Redux slice (`*Slice.tsx`)
- **Env vars**: Prefixed with `VITE_` — see `.env.example` for required variables (`VITE_GOOGLE_CLIENT_ID`, `VITE_BASE_URL`)

### Routes
- `/login` — Google OAuth login
- `/campaigns` — Campaign list (main page, `/` redirects here)
- `/campaigns/:id` — Campaign detail/editor
- `/signatures` — Email signature management
- `/history` — History page (placeholder)

## Code Rules

### Tailwind CSS
- **Always use built-in Tailwind classes** (e.g. `px-4`, `gap-2`, `text-sm`). Do not use arbitrary values like `px-[12px]`, `w-[300px]`, `text-[14px]`.
- If no suitable class exists, create a reusable custom utility/class in the theme instead of using `...-[]`. Prioritize following the design system and Tailwind's standard scales (spacing, font size, etc.).

### API layer (`src/features/{domain}/{domain}Api.tsx`)
- One thunk per endpoint via `createAsyncThunk<ReturnType, ArgType>`, action type string `'api/verb-noun'` (e.g. `'api/create-signature'`), calling `sendRequest(path, method, payload, thunkApi)` from `@/utils`.
- Request/response types (`interface`) are colocated in the same `*Api.tsx` file, not a separate `types/` directory — see `Signature`, `CreateSignaturePayload` in `src/features/signature/signatureApi.tsx`.
- A `*Slice.tsx` is **not** mandatory — only add one when the domain needs shared/global state (e.g. `authSlice.tsx`, `campaignSlice.tsx`). If a screen only needs request status/result locally, consume the thunk's result in component state instead of adding a slice.
- Slice action names are camelCase verbs (`setCredentials`, `setLoading`, `initializeAuth`) — Redux Toolkit + Immer, so reducers mutate state directly.

### Validation
- **Always validate data with Yup** before submitting. Define schemas in `src/schema/` (one file per form/domain, not per component).
- Export both the TS `interface` and the `yup.ObjectSchema<Interface>` from the same file — see `FeedbackCreateInput` + `feedbackFormSchema` in `src/schema/feedback.ts`.

### Comments
- Inline comments may be written in Vietnamese or English — the existing codebase mixes both (e.g. `authSlice.tsx`). Match the surrounding file's language rather than converting wholesale.

### Backend
The companion backend lives at `../backend/`. API base path is `/v1`. Key endpoints: `/auth/*`, `/campaigns/*`, `/signatures/*`, `/emails/*`. See `../backend/CLAUDE.md` for backend response shape and error conventions.
