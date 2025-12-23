# Nginx 配置说明 - 单项目部署

## 概述

本项目现在配置为在单台服务器上部署单个项目（Allowance），项目目录位于 `/home/admin/allowance`，nginx监听端口80和443。

## 配置说明

### 项目结构
```
/home/admin/allowance/
├── server/          # Rust后端
├── client/          # Next.js前端
├── nginx/           # nginx配置
└── docker-compose.prod.yml
```

### Nginx配置

nginx作为反向代理，监听80（HTTP）和443（HTTPS，如果配置SSL）端口：

- **前端UI**: `http://your-server:80/` 或 `https://your-server:443/`
- **后端API**: `http://your-server:80/api/` 或 `https://your-server:443/api/`

#### nginx.conf 配置示例
```nginx
server {
    listen 80;
    server_name _;

    # API代理到后端
    location /api/ {
        proxy_pass http://localhost:4040;
        # ... 其他代理设置
    }

    # 前端代理到Next.js
    location / {
        proxy_pass http://localhost:3030;
        # ... 其他代理设置
    }
}

# HTTPS服务器（如果有SSL证书）
server {
    listen 443 ssl;
    server_name _;
    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # 相同代理配置
    location /api/ {
        proxy_pass http://localhost:4040;
    }

    location / {
        proxy_pass http://localhost:3030;
    }
}
```

## 部署步骤

1. **安装nginx**（如果使用主机nginx）：
   ```bash
   sudo apt update && sudo apt install nginx  # Ubuntu/Debian
   ```

2. **复制配置**：
   ```bash
   sudo cp /home/admin/allowance/nginx/nginx.conf /etc/nginx/nginx.conf
   ```

3. **测试并重载**：
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

4. **启动应用服务**：
   - 后端：`cd /home/admin/allowance/server && ./target/release/allowance-server`
   - 前端：`cd /home/admin/allowance/client && npm start`

## SSL证书配置

要启用HTTPS：

1. 获取SSL证书（Let's Encrypt或其他）：
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d your-domain.com
   ```

2. nginx会自动配置443端口。

## 防火墙设置

确保端口80和443开放：
```bash
sudo ufw allow 80
sudo ufw allow 443
```

## 监控和日志

- nginx日志：`/var/log/nginx/`
- 应用日志：检查各自服务的日志输出

## 故障排除

- 检查端口占用：`sudo netstat -tlnp | grep :80`
- 测试配置：`sudo nginx -t`
- 查看错误：`sudo systemctl status nginx`