# React Boilerplate

A modern, production-ready React boilerplate with TypeScript, Vite, Tailwind CSS, and ESLint.

## Quick Start

### Prerequisites
- Node.js 18+ installed
- npm or yarn package manager

### Installation

```bash
cd react
npm install
```

### Development

Start the development server with hot module replacement:

```bash
npm run dev
```

The app will open automatically at `http://localhost:3000`

### Build

Create an optimized production build:

```bash
npm run build
```

The output will be in the `dist` folder.

### Preview Production Build

```bash
npm run preview
```

### Linting

Check code quality:

```bash
npm run lint
```

### Formatting

Auto-format code:

```bash
npm run format
```

## Project Structure

```
react/
├── src/
│   ├── components/     # Reusable React components
│   ├── pages/          # Page components
│   ├── hooks/          # Custom React hooks
│   ├── utils/          # Utility functions
│   ├── App.tsx         # Main App component
│   ├── main.tsx        # Entry point
│   ├── index.css       # Global styles with Tailwind
│   └── App.css         # App-specific styles
├── index.html          # HTML entry point
├── vite.config.ts      # Vite configuration
├── tsconfig.json       # TypeScript configuration
├── tailwind.config.js  # Tailwind CSS configuration
├── postcss.config.js   # PostCSS configuration
├── .eslintrc.cjs       # ESLint configuration
└── .prettierrc          # Prettier configuration
```

## Features

✅ **React 18** - Latest React features  
✅ **TypeScript** - Type-safe development  
✅ **Vite** - Lightning-fast dev server  
✅ **Tailwind CSS** - Utility-first CSS framework  
✅ **ESLint** - Code quality enforcement  
✅ **Prettier** - Code formatting  
✅ **Path Aliases** - Clean imports with `@/*`  
✅ **Hot Module Replacement** - Instant updates during development  
✅ **Optimized Build** - Tree-shaking and minification  

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier

## Browser Support

Modern browsers (Chrome, Firefox, Safari, Edge)

## License

MIT
