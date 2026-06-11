#!/bin/bash
# 部署个人网站到微信云开发
# 用法: bash deploy.sh

set -e

ENV_ID="cloudbase-4g6zx8vx290da64e"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

echo "=== 1. 构建静态网站 ==="
echo "清理旧构建..."
rm -rf .next out

echo "安装依赖..."
npm install

echo "构建..."
npm run build

if [ ! -d "out" ]; then
    echo "错误: 构建失败，out 目录不存在"
    exit 1
fi
echo "构建完成，输出目录: out/"

echo ""
echo "=== 2. 部署到云托管 ==="
tcb hosting deploy ./out -e "$ENV_ID"
echo "部署完成！"

echo ""
echo "网站地址: https://${ENV_ID}-1323596446.tcloudbaseapp.com/"
