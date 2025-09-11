# Development Guide

## 🚀 Quick Start

### Normal Development
```bash
npm run dev
```

### Clean Restart (when you get internal server errors)
```bash
npm run dev:clean
```

## 🔧 Troubleshooting

### Internal Server Error / Build Manifest Errors

If you see errors like:
```
⨯ [Error: ENOENT: no such file or directory, open '/Users/maxstiling/fitness-gap/.next/static/development/_buildManifest.js.tmp.xxx']
```

**Solution:** Use the clean restart command:
```bash
npm run dev:clean
```

This will:
1. Stop any running Next.js processes
2. Clear the `.next` build cache
3. Wait 2 seconds
4. Start a fresh development server

### Alternative: Manual Clean Restart
```bash
# Kill processes
pkill -f "next dev"

# Clear cache
rm -rf .next

# Restart
npm run dev
```

### Or use the shell script:
```bash
./restart-dev.sh
```

## 🎯 Why This Happens

The internal server errors occur when:
- Next.js build cache gets corrupted
- Multiple development servers are running
- File system changes aren't properly detected
- Turbopack (the build system) gets confused

The clean restart fixes all of these issues by starting fresh.

## 💡 Pro Tips

1. **Always use `npm run dev:clean`** when you get internal server errors
2. **Don't run multiple `npm run dev` commands** - kill existing ones first
3. **If in doubt, clean restart** - it's faster than debugging cache issues
4. **The app works perfectly** - this is just a development server quirk
