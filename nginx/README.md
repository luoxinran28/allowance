# Nginx 多IP地址配置说明

## 问题背景

你询问如何通过不同的IP地址访问不同的nginx服务：
- `8.218.151.90:80` → 使用 `/var/www/minerbond/` 下的nginx服务
- `47.238.0.109:80` → 使用 `/var/www/allowance/` 下的nginx服务

## 解决方案

### 方案1：单台服务器多IP地址（你当前使用的方案）

这是成本最优化的方式，在同一台服务器上配置多个IP地址：

```
单台服务器:
├── IP 1: 8.218.151.90 → minerbond项目
├── IP 2: 47.238.0.109 → allowance项目
└── nginx配置: 分别监听不同IP的80端口
```

**nginx配置示例**：
```nginx
# minerbond服务 (8.218.151.90)
server {
    listen 8.218.151.90:80;
    root /var/www/minerbond;
    # ... minerbond配置
}

# allowance服务 (47.238.0.109)
server {
    listen 47.238.0.109:80;
    root /var/www/allowance;
    # ... allowance配置
}
```

### 方案2：不同服务器（推荐用于高可用性）

最简单和最安全的方式是使用两台不同的服务器。

### 方案3：反向代理（最灵活）

使用一个前端nginx根据域名或路径路由到不同的后端服务。

## 当前Allowance项目的配置

### Docker方式（当前配置）

当前配置直接暴露容器端口：
- 后端API: `47.238.0.109:4040`
- 前端UI: `47.238.0.109:3030`

### Nginx反向代理方式（单IP绑定）

启用nginx服务后，通过 `47.238.0.109:80` 访问：
- 前端UI: `http://47.238.0.109/`
- 后端API: `http://47.238.0.109/api/`

## 为Minerbond项目配置类似设置

我已经创建了一个示例配置文件 `minerbond-example.conf`，你可以参考它来配置minerbond项目的nginx：

1. **复制示例配置**：
   ```bash
   cp nginx/minerbond-example.conf /path/to/minerbond/nginx.conf
   ```

2. **修改配置**：
   - 将 `8.218.151.90` 改为你的minerbond IP
   - 调整upstream服务器端口以匹配你的minerbond容器
   - 修改server_name和路径

3. **启动minerbond的nginx**：
   ```bash
   docker run -d --name minerbond-nginx \
     -p 8.218.151.90:80:80 \
     -v /path/to/minerbond/nginx.conf:/etc/nginx/nginx.conf:ro \
     nginx:alpine
   ```

## 启用Nginx反向代理

要启用nginx反向代理，请：

1. **确保服务器有多个IP地址绑定**
2. **编辑 `docker-compose.prod.yml`**，取消注释nginx服务部分
3. **重新部署**：
   ```bash
   sudo bash deploy/deploy.sh rebuild
   ```

## 服务器多IP配置检查

在Linux服务器上检查IP配置：

```bash
# 查看所有IP地址
ip addr show

# 或使用
ifconfig -a

# 查看路由表
ip route show
```

## SSL证书配置（多IP场景）

对于多IP配置，每个IP可以有独立的SSL证书：

1. 为每个IP创建独立的证书目录：
   ```
   nginx/ssl/allowance/  # 47.238.0.109的证书
   nginx/ssl/minerbond/  # 8.218.151.90的证书
   ```

2. nginx配置中指定对应的证书路径

## Docker网络注意事项

在单服务器多IP配置中，需要确保：
- Docker容器可以绑定到特定的IP地址
- 防火墙规则允许相应IP的流量
- SELinux/AppArmor策略允许IP绑定（如果启用）

## 总结

你的单台服务器多IP配置是非常好的成本优化方案。Allowance项目已经配置为绑定到 `47.238.0.109:80`，而minerbond项目可以类似配置绑定到 `8.218.151.90:80`。

这种配置的优势：
- 节省服务器成本
- 简化管理（单台服务器）
- 每个服务独立配置
- 便于扩展