# Guide

이 문서는 `Job Scam Detector`를 처음 실행할 때 필요한 기본 설치 및 실행 명령어를 정리한 가이드다.

## 권장 환경

- Node.js `22` 이상
- npm `10` 이상 또는 pnpm `10` 이상
- Git 선택 사항

## 프로젝트 실행 기본 흐름

1. 저장소 또는 프로젝트 폴더로 이동
2. 패키지 설치
3. 개발 서버 실행
4. 브라우저에서 `http://localhost:3000` 열기

중요:
- 관리자 룰 에디터 페이지 `/admin` 은 개발 서버에서만 열린다.
- 즉 `npm run dev` 또는 `pnpm dev` 일 때만 접근 가능하다.
- `npm run build && npm run start` 환경에서는 관리자 페이지와 관리자 API가 비활성화된다.

## macOS / Linux

### npm 사용

```bash
node -v
npm -v
npm install
npm run dev
```

### pnpm 사용

```bash
corepack enable
pnpm -v
pnpm install
pnpm dev
```

### 프로덕션 빌드 확인

```bash
npm run build
npm run start
```

## Windows

### 1. Node.js 설치 확인

PowerShell:

```powershell
node -v
npm -v
```

설치가 안 되어 있으면 `winget` 기준 예시는 아래처럼 진행할 수 있다.

```powershell
winget install OpenJS.NodeJS.LTS
```

새 PowerShell 창을 다시 연 뒤 버전을 다시 확인한다.

### 2. npm으로 설치 및 실행

PowerShell:

```powershell
cd C:\path\to\ysb_vibe
npm install
npm run dev
```

브라우저:

```text
http://localhost:3000
```

### 3. pnpm 사용 시

PowerShell:

```powershell
corepack enable
pnpm -v
pnpm install
pnpm dev
```

### 4. 프로덕션 실행

PowerShell:

```powershell
npm run build
npm run start
```

이 모드에서는 `/admin` 이 열리지 않는 것이 정상이다.

## 자주 쓰는 명령어

### 개발 서버

```bash
npm run dev
```

### 린트 검사

```bash
npm run lint
```

### 프로덕션 빌드

```bash
npm run build
```

### 프로덕션 서버 실행

```bash
npm run start
```

## 문제 해결

### 포트 3000이 이미 사용 중일 때

```bash
npm run dev -- --port 3001
```

### 의존성 재설치

macOS / Linux:

```bash
rm -rf node_modules .next package-lock.json
npm install
```

Windows PowerShell:

```powershell
Remove-Item -Recurse -Force node_modules, .next, package-lock.json
npm install
```

### 관리자 페이지가 안 열릴 때

아래 중 하나면 정상이다.

- `npm run build` 후 `npm run start` 로 실행 중이다
- `NODE_ENV=production` 환경이다
- `/admin` 은 개발 전용이므로 `npm run dev` 로 다시 실행해야 한다
