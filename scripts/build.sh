#!/bin/bash
# 智能检测包管理器并运行 build 命令
# 支持: npm, pnpm, bun, deno

# 优先使用环境变量指定的包管理器
if [ -n "$PKG_MANAGER" ]; then
    case "$PKG_MANAGER" in
        deno)
            echo "Using Deno (via PKG_MANAGER)..."
            deno task build
            exit $?
            ;;
        bun)
            echo "Using Bun (via PKG_MANAGER)..."
            bun run build
            exit $?
            ;;
        pnpm)
            echo "Using pnpm (via PKG_MANAGER)..."
            pnpm build
            exit $?
            ;;
        npm)
            echo "Using npm (via PKG_MANAGER)..."
            npm run build
            exit $?
            ;;
    esac
fi

# 兼容旧的环境变量
if [ -n "$USE_DENO" ]; then
    PKG_MANAGER=deno
elif [ -n "$USE_BUN" ]; then
    PKG_MANAGER=bun
elif [ -n "$USE_PNPM" ]; then
    PKG_MANAGER=pnpm
elif [ -n "$USE_NPM" ]; then
    PKG_MANAGER=npm
fi

if [ -n "$PKG_MANAGER" ]; then
    case "$PKG_MANAGER" in
        deno) deno task build ;;
        bun) bun run build ;;
        pnpm) pnpm build ;;
        npm) npm run build ;;
    esac
    exit $?
fi

# 根据锁文件自动检测包管理器
detect_pm() {
    if [ -f "bun.lock" ] && command -v bun &> /dev/null; then
        echo "bun"
    elif [ -f "pnpm-lock.yaml" ] && command -v pnpm &> /dev/null; then
        echo "pnpm"
    elif [ -f "deno.json" ] && command -v deno &> /dev/null; then
        echo "deno"
    elif [ -f "package-lock.json" ] && command -v npm &> /dev/null; then
        echo "npm"
    elif command -v bun &> /dev/null; then
        echo "bun"
    elif command -v pnpm &> /dev/null; then
        echo "pnpm"
    elif command -v deno &> /dev/null; then
        echo "deno"
    elif command -v npm &> /dev/null; then
        echo "npm"
    else
        echo ""
    fi
}

PM=$(detect_pm)

if [ -z "$PM" ]; then
    echo "Error: No package manager found!"
    echo "Please install one of: npm, pnpm, bun, deno"
    exit 1
fi

echo "Using $PM..."
case "$PM" in
    deno) deno task build ;;
    bun) bun run build ;;
    pnpm) pnpm build ;;
    npm) npm run build ;;
esac
