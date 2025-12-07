#!/bin/bash

# 部署脚本
# 功能：构建项目、打包文件、上传到服务器并部署

set -e  # 遇到错误时退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color
remote_server=swellee-test-baidu

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
    local commands=("go" "tar" "scp" "ssh")
    for cmd in "${commands[@]}"; do
        if ! command -v "$cmd" &> /dev/null; then
            print_error "$cmd 命令未找到，请先安装"
            exit 1
        fi
    done
    print_info "所有必要命令检查通过"
}

# 1. 构建项目
build_project() {
    print_info "开始构建项目..."
    
    # 设置目标架构
    export GOOS=linux
    export GOARCH=amd64
    
    # 构建可执行文件
    go build -o luma main.go
    
    if [ -f "luma" ]; then
        print_info "项目构建成功"
    else
        print_error "项目构建失败"
        exit 1
    fi
}

# 2. 打包文件
package_files() {
    print_info "开始打包文件..."
    
    # 创建临时目录
    rm -rf deploy_temp
    mkdir -p deploy_temp
    
    # 复制需要的文件
    cp luma deploy_temp/
    cp run.sh deploy_temp/
    
    # 打包为 tar.gz
    tar -czf luma.tar.gz -C deploy_temp .
    
    # 清理临时目录
    rm -rf deploy_temp
    
    if [ -f "luma.tar.gz" ]; then
        print_info "文件打包成功: luma.tar.gz"
    else
        print_error "文件打包失败"
        exit 1
    fi
}

# 3. 上传到服务器并部署
deploy_to_server() {
    local server_path=${DEPLOY_PATH:-"server"}
    
    print_info "开始上传文件到服务器 ${remote_server}"
    
    # 上传打包文件
    scp luma.tar.gz ${remote_server}:server
    
    if [ $? -ne 0 ]; then
        print_error "文件上传失败"
        exit 1
    fi
    
    print_info "文件上传成功"
    
    # 在服务器上解压并运行
    print_info "在服务器上解压并部署..."
    ssh ${remote_server} "
        cd $server_path && \
        tar -xzf luma.tar.gz && \
        chmod +x luma run.sh && \
        ./run.sh restart
    "
    
    if [ $? -eq 0 ]; then
        print_info "部署成功完成"
    else
        print_error "服务器部署失败"
        exit 1
    fi
}

# 清理构建产物
cleanup() {
    print_info "清理构建产物..."
    rm -f luma luma.tar.gz
    print_info "清理完成"
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo "选项:"
    echo "  build     只构建项目"
    echo "  package   构建并打包文件"
    echo "  deploy    构建、打包并部署到服务器"
    echo "  clean     清理构建产物"
    echo "  help      显示此帮助信息"
    echo ""
    echo "环境变量:"
    echo "  DEPLOY_HOST  目标服务器地址 (必须)"
    echo "  DEPLOY_USER  目标服务器用户 (默认: root)"
    echo "  DEPLOY_PATH  目标部署路径 (默认: /root/server)"
    echo ""
    echo "示例:"
    echo "  DEPLOY_HOST=your-server.com $0 deploy"
}

# 主函数
main() {
    case "$1" in
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
            cleanup
            ;;
        clean)
            cleanup
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