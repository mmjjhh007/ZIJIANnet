#!/usr/bin/env bash
set -euo pipefail

# deploy_pm2_nginx.sh
# 一键部署脚本（Ubuntu 20.04/22.04）。
# 用法示例：
# sudo ROOT_DIR=/var/www ORDER_REPO=https://github.com/mmjjhh007/ZIJIANnet.git \
#      ROOT_DOMAIN=example.com API_HOST=api.example.com MINI_HOST=mini.example.com \
#      CERT_EMAIL=you@example.com ./deploy_pm2_nginx.sh

if [ "$EUID" -ne 0 ]; then
  echo "请用 sudo 运行此脚本（或以 root 用户）" >&2
  exit 1
fi

ROOT_DIR=${ROOT_DIR:-/var/www/order-management-system}
ORDER_REPO=${ORDER_REPO:-https://github.com/mmjjhh007/ZIJIANnet.git}
ROOT_DOMAIN=${ROOT_DOMAIN:-example.com}
API_HOST=${API_HOST:-api.example.com}
MINI_HOST=${MINI_HOST:-mini.example.com}
CERT_EMAIL=${CERT_EMAIL:-}

echo "部署参数："
echo "  ROOT_DIR=$ROOT_DIR"
echo "  ORDER_REPO=$ORDER_REPO"
echo "  ROOT_DOMAIN=$ROOT_DOMAIN"
echo "  API_HOST=$API_HOST"
echo "  MINI_HOST=$MINI_HOST"

echo "更新包索引并安装依赖（git、curl、nginx、certbot、node）"
apt update
apt install -y git curl nginx certbot python3-certbot-nginx build-essential

if ! command -v node >/dev/null 2>&1; then
  echo "安装 Node.js 18.x"
  curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
  apt-get install -y nodejs
fi

if ! command -v pm2 >/dev/null 2>&1; then
  echo "安装 pm2"
  npm install -g pm2
fi

mkdir -p "$ROOT_DIR"
chown $SUDO_USER:$SUDO_USER "$ROOT_DIR"

if [ ! -d "$ROOT_DIR/.git" ]; then
  echo "克隆仓库到 $ROOT_DIR"
  sudo -u $SUDO_USER git clone "$ORDER_REPO" "$ROOT_DIR"
else
  echo "仓库已存在，拉取最新代码"
  sudo -u $SUDO_USER git -C "$ROOT_DIR" pull
fi

echo "安装后端依赖并构建（后端）"
cd "$ROOT_DIR/backend"
sudo -u $SUDO_USER npm install --production

echo "确保 ecosystem.config.js 在仓库根（使用已提交的文件或手动调整）"
PM2_ECOSYSTEM="$ROOT_DIR/ecosystem.config.js"
if [ ! -f "$PM2_ECOSYSTEM" ]; then
  echo "警告：未找到 $PM2_ECOSYSTEM，请确认已提交该文件或手动提供" >&2
fi

echo "使用 pm2 启动应用"
sudo -u $SUDO_USER pm2 start "$PM2_ECOSYSTEM" --env production || true
sudo -u $SUDO_USER pm2 save
pm2startup_cmd=$(pm2 startup systemd -u $SUDO_USER --hp /home/$SUDO_USER | sed -n 's/\(sudo .*\)/\1/p') || true
if [ -n "$pm2startup_cmd" ]; then
  echo "执行 pm2 startup 命令以注册 systemd 单元（需要 sudo）:"
  echo "$pm2startup_cmd"
  eval "$pm2startup_cmd"
fi

echo "配置 Nginx: 将项目内的 deploy/nginx/conf.d/apps.conf 替换域名后复制到 /etc/nginx/conf.d/apps.conf"
# 优先使用仓库中定制的 nginx 配置（例如 apps.zijian.conf），
# 若不存在再使用通用的 apps.conf
DEST_NGINX_CONF="/etc/nginx/conf.d/apps.conf"
SRC_NGINX_CONF=""
for candidate in \
  "$ROOT_DIR/deploy/nginx/conf.d/apps.zijian.conf" \
  "$ROOT_DIR/deploy/nginx/conf.d/apps.conf"; do
  if [ -f "$candidate" ]; then
    SRC_NGINX_CONF="$candidate"
    break
  fi
done

if [ -n "$SRC_NGINX_CONF" ]; then
  echo "找到 nginx 配置： $SRC_NGINX_CONF -> $DEST_NGINX_CONF"
  # 尝试替换占位符（如果有）并写入临时文件
  sed -e "s/example.com/$ROOT_DOMAIN/g" \
      -e "s/api.example.com/$API_HOST/g" \
      -e "s/mini.example.com/$MINI_HOST/g" "$SRC_NGINX_CONF" > /tmp/apps.conf
  if [ -f "$DEST_NGINX_CONF" ]; then
    echo "备份现有 nginx 配置到 ${DEST_NGINX_CONF}.bak.$(date +%s)"
    cp "$DEST_NGINX_CONF" "$DEST_NGINX_CONF.bak.$(date +%s)"
  fi
  mv /tmp/apps.conf "$DEST_NGINX_CONF"
  nginx -t
  systemctl reload nginx
else
  echo "未找到仓库中的 nginx 配置（apps.zijian.conf 或 apps.conf），请手动放置配置到 $ROOT_DIR/deploy/nginx/conf.d/ 或 /etc/nginx/conf.d/" >&2
fi

if [ -n "$CERT_EMAIL" ]; then
  echo "运行 certbot 申请证书：$API_HOST $MINI_HOST $ROOT_DOMAIN"
  certbot --nginx -n --agree-tos --email "$CERT_EMAIL" -d "$ROOT_DOMAIN" -d "$API_HOST" -d "$MINI_HOST" || true
  certbot renew --dry-run || true
else
  echo "CERT_EMAIL 未设置，跳过自动申请证书。若需申请证书，请设置 CERT_EMAIL 并重新运行本脚本或手动运行 certbot。"
fi

echo "部署完成。可使用： pm2 logs | pm2 status | sudo systemctl status nginx"
echo "如果需要在防火墙或安全组打开 80/443/22 端口，请在云控制台配置。"

exit 0
