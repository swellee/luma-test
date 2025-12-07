#!/bin/bash

# 前端部署脚本
# 功能：构建前端项目、打包文件、上传到服务器并部署到 /var/www/home

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 配置变量
REMOTE_SERVER="swellee-test-baidu"  # 远程服务器，可以通过环境变量覆盖
REMOTE_PATH="/var/www/home"         # 远程部署路径
LOCAL_DIST_DIR="dist"               # 本地构建输出目录
PACKAGE_NAME="frontend.tar.gz"      # 打包文件名

# 打印信息的函数
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 检查必要命令是否存在
check_commands() {
    local commands=("node" "npm" "tar" "scp" "ssh")
    
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "$cmd 命令未找到，请先安装"
            exit 1
        fi
    done
    
    # 检查 pnpm 是否可用（可选）
    if command -v "pnpm" &> /dev/null; then
        PACKAGE_MANAGER="pnpm"
        print_info "检测到 pnpm，将使用 pnpm 进行构建"
    else
        PACKAGE_MANAGER="npm"
        print_info "使用 npm 进行构建"
    fi
    
    print_info "所有必要命令检查通过"
}

# 1. 安装依赖
install_dependencies() {
    print_info "开始安装依赖..."
    
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm install
    else
        npm install
    fi
    
    if [ $? -eq 0 ]; then
        print_info "依赖安装成功"
    else
        print_error "依赖安装失败"
        exit 1
    fi
}

# 2. 构建项目
build_project() {
    print_info "开始构建项目..."
    
    # 清理之前的构建
    if [ -d "$LOCAL_DIST_DIR" ]; then
        print_info "清理旧的构建文件..."
        rm -rf "$LOCAL_DIST_DIR"
    fi
    
    # 执行构建
    if [ "$PACKAGE_MANAGER" = "pnpm" ]; then
        pnpm run build
    else
        npm run build
    fi
    
    if [ -d "$LOCAL_DIST_DIR" ]; then
        print_info "项目构建成功，输出目录: $LOCAL_DIST_DIR"
        
        # 显示构建文件信息
        local file_count=$(find "$LOCAL_DIST_DIR" -type f | wc -l)
        local total_size=$(du -sh "$LOCAL_DIST_DIR" | cut -f1)
        print_info "构建文件数量: $file_count，总大小: $total_size"
    else
        print_error "项目构建失败，未找到 $LOCAL_DIST_DIR 目录"
        exit 1
    fi
}

# 3. 打包文件
package_files() {
    print_info "开始打包文件..."
    
    # 检查 dist 目录是否存在
    if [ ! -d "$LOCAL_DIST_DIR" ]; then
        print_error "构建目录 $LOCAL_DIST_DIR 不存在，请先运行构建"
        exit 1
    fi
    
    # 删除旧的打包文件
    if [ -f "$PACKAGE_NAME" ]; then
        rm -f "$PACKAGE_NAME"
    fi
    
    # 打包 dist 目录的内容（不包含 dist 目录本身）
    # 使用 -C 切换到 dist 目录，然后打包当前目录的内容
    tar -czf "$PACKAGE_NAME" -C "$LOCAL_DIST_DIR" .
    
    if [ -f "$PACKAGE_NAME" ]; then
        local package_size=$(du -h "$PACKAGE_NAME" | cut -f1)
        print_info "文件打包成功: $PACKAGE_NAME (大小: $package_size)"
        print_info "打包内容: $LOCAL_DIST_DIR 目录内的所有文件（不包含 $LOCAL_DIST_DIR 目录本身）"
    else
        print_error "文件打包失败"
        exit 1
    fi
}

# 4. 上传到服务器并部署
deploy_to_server() {
    print_info "开始部署到服务器..."
    
    # 检查打包文件是否存在
    if [ ! -f "$PACKAGE_NAME" ]; then
        print_error "打包文件 $PACKAGE_NAME 不存在，请先运行打包"
        exit 1
    fi
    
    # 检查远程服务器配置
    if [ -z "$REMOTE_SERVER" ]; then
        print_error "远程服务器未配置，请设置 REMOTE_SERVER 环境变量"
        exit 1
    fi
    
    print_info "目标服务器: $REMOTE_SERVER"
    print_info "部署路径: $REMOTE_PATH"
    
    # 上传打包文件
    print_info "上传文件到服务器..."
    scp "$PACKAGE_NAME" "${REMOTE_SERVER}:${REMOTE_PATH}/"
    
    if [ $? -ne 0 ]; then
        print_error "文件上传失败"
        exit 1
    fi
    
    print_info "文件上传成功"
    
    # 在服务器上解压并部署
    print_info "在服务器上解压并部署..."
    ssh "$REMOTE_SERVER" "
        set -e
        echo '切换到部署目录: $REMOTE_PATH'
        cd '$REMOTE_PATH' || { echo '无法进入目录 $REMOTE_PATH'; exit 1; }
        
        echo '备份当前文件...'
        # 创建备份目录
        BACKUP_DIR=\"backup_\$(date +%Y%m%d_%H%M%S)\"
        mkdir -p \"\$BACKUP_DIR\"
        
        # 备份除备份目录本身外的所有文件
        find . -maxdepth 1 ! -name . ! -name \"\$BACKUP_DIR\" ! -name '*.tar.gz' -exec cp -r {} \"\$BACKUP_DIR/\" \;
        echo \"当前版本已备份到: \$BACKUP_DIR\"
        
        echo '清理旧文件（除备份目录和tar.gz文件）...'
        find . -maxdepth 1 ! -name . ! -name \"\$BACKUP_DIR\" ! -name '*.tar.gz' -exec rm -rf {} \;
        
        echo '解压新版本...'
        tar -xzf '$PACKAGE_NAME'
        
        echo '设置文件权限...'
        # 检测系统类型并设置正确的用户权限
        if [ -f /etc/debian_version ]; then
            chown -R www-data:www-data .
            echo '设置权限为 www-data (Ubuntu/Debian)'
        elif [ -f /etc/redhat-release ]; then
            chown -R nginx:nginx .
            echo '设置权限为 nginx (CentOS/RHEL)'
        else
            echo '未知系统类型，跳过权限设置'
        fi
        chmod -R 755 .
        
        echo '清理临时文件...'
        rm -f '$PACKAGE_NAME'
        
        echo '部署完成！文件已直接解压到 $REMOTE_PATH/ 目录下'
        
        # 显示部署结果
        echo '部署结果:'
        ls -la
        
        # 可选：重启 Nginx
        echo '检查 Nginx 状态...'
        if systemctl is-active --quiet nginx 2>/dev/null || service nginx status >/dev/null 2>&1; then
            echo 'Nginx 正在运行，重新加载配置...'
            if nginx -t 2>/dev/null; then
                echo 'Nginx 配置测试通过'
                nginx -s reload 2>/dev/null || systemctl reload nginx 2>/dev/null || service nginx reload 2>/dev/null || echo 'Nginx 重新加载失败'
            else
                echo '警告：Nginx 配置测试失败，请手动检查'
            fi
        else
            echo 'Nginx 未运行，尝试启动...'
            systemctl start nginx 2>/dev/null || service nginx start 2>/dev/null || echo 'Nginx 启动失败，请手动检查'
        fi
    "
    
    if [ $? -eq 0 ]; then
        print_info "部署成功完成"
    else
        print_error "服务器部署失败"
        exit 1
    fi
}

# 5. 快速部署（安装依赖、构建、打包、部署）
quick_deploy() {
    print_info "开始快速部署流程..."
    check_commands
    install_dependencies
    build_project
    package_files
    deploy_to_server
    cleanup
    print_info "快速部署完成"
}

# 清理构建产物
cleanup() {
    print_info "清理构建产物..."
    
    # 删除打包文件
    if [ -f "$PACKAGE_NAME" ]; then
        rm -f "$PACKAGE_NAME"
        print_info "删除打包文件: $PACKAGE_NAME"
    fi
    
    # 可选：删除 dist 目录
    if [ "$1" = "all" ] && [ -d "$LOCAL_DIST_DIR" ]; then
        rm -rf "$LOCAL_DIST_DIR"
        print_info "删除构建目录: $LOCAL_DIST_DIR"
    fi
    
    print_info "清理完成"
}

# 显示部署状态
show_status() {
    print_info "当前部署状态:"
    echo "远程服务器: $REMOTE_SERVER"
    echo "部署路径: $REMOTE_PATH"
    echo "本地构建目录: $LOCAL_DIST_DIR"
    echo "打包文件: $PACKAGE_NAME"
    
    if [ -d "$LOCAL_DIST_DIR" ]; then
        local file_count=$(find "$LOCAL_DIST_DIR" -type f | wc -l)
        local total_size=$(du -sh "$LOCAL_DIST_DIR" 2>/dev/null | cut -f1 || echo "未知")
        echo "构建目录状态: 存在 ($file_count 个文件, $total_size)"
    else
        echo "构建目录状态: 不存在"
    fi
    
    if [ -f "$PACKAGE_NAME" ]; then
        local package_size=$(du -h "$PACKAGE_NAME" 2>/dev/null | cut -f1 || echo "未知")
        echo "打包文件状态: 存在 ($package_size)"
    else
        echo "打包文件状态: 不存在"
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "前端部署脚本 - 构建 React SPA 并部署到远程服务器"
    echo ""
    echo "选项:"
    echo "  install    安装依赖"
    echo "  build      构建项目"
    echo "  package    构建并打包文件"
    echo "  deploy     构建、打包并部署到服务器"
    echo "  quick      快速部署（安装依赖、构建、打包、部署）"
    echo "  status     显示当前部署状态"
    echo "  clean      清理构建产物"
    echo "  clean-all  清理所有构建产物（包括 dist 目录）"
    echo "  help       显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  REMOTE_SERVER  目标服务器地址 (默认: swellee-test-baidu)"
    echo "  REMOTE_PATH    目标部署路径 (默认: /var/www/home)"
    echo "  PACKAGE_MANAGER 包管理器，自动检测 pnpm 或 npm"
    echo ""
    echo "示例:"
    echo "  $0 build                     # 仅构建项目"
    echo "  $0 package                   # 构建并打包"
    echo "  REMOTE_SERVER=my-server.com $0 deploy  # 部署到指定服务器"
    echo "  $0 quick                     # 完整快速部署"
    echo ""
    echo "服务器要求:"
    echo "  1. 已安装 Nginx 并配置好反向代理"
    echo "  2. /var/www/home 目录存在且有写入权限"
    echo "  3. 配置了 SSH 密钥认证"
}

# 主函数
main() {
    case "$1" in
        install)
            check_commands
            install_dependencies
            ;;
        build)
            check_commands
            build_project
            ;;
        package)
            check_commands
            build_project
            package_files
            ;;
        deploy)
            check_commands
            build_project
            package_files
            deploy_to_server
            ;;
        quick)
            quick_deploy
            ;;
        status)
            show_status
            ;;
        clean)
            cleanup
            ;;
        clean-all)
            cleanup "all"
            ;;
        help|"")
            show_help
            ;;
        *)
            print_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
}

# 执行主函数
main "$@"
