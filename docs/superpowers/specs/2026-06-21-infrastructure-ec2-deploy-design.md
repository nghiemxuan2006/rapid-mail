# Infrastructure & Deployment Design

**Date:** 2026-06-21
**Scope:** CloudFormation EC2 stack + Nginx reverse proxy + GitHub Actions CI/CD

---

## Overview

Tạo folder `infrastructure/` cùng cấp với `backend/` và `frontend/`, chứa CloudFormation template để provision EC2 trên AWS, cấu hình Nginx reverse proxy cho cả backend và frontend, và GitHub Actions workflow để auto-deploy khi push/PR vào branch `test`.

---

## Folder Structure

```
infrastructure/
├── cloudformation/
│   └── ec2-stack.yml          # CloudFormation template
├── nginx/
│   └── Dockerfile             # Build nginx image, COPY config từ backend/nginx/
└── scripts/
    └── deploy.sh              # Deploy script chạy trên EC2

backend/
└── nginx/
    └── nginx.conf             # Reverse proxy HTTPS config + proxy /api/

frontend/
└── nginx.conf                 # Config serve static files (internal)

.github/
└── workflows/
    └── deploy.yml             # GitHub Actions workflow
```

---

## CloudFormation — `ec2-stack.yml`

### Resources

| Resource | Config |
|---|---|
| VPC | CIDR `10.0.0.0/16` |
| Public Subnet | CIDR `10.0.1.0/24`, MapPublicIpOnLaunch: true |
| Internet Gateway | Attached to VPC |
| Route Table | Default route `0.0.0.0/0` → Internet Gateway |
| Security Group | Inbound: 22 (SSH), 80 (HTTP), 443 (HTTPS), 15672 (RabbitMQ Management) |
| EC2 Instance | Amazon Linux 2, `t3.micro`, KeyPair qua parameter |
| Elastic IP | Gắn cố định vào EC2 |

### Parameters

- `KeyPairName` — tên key pair đã tạo trên AWS
- `InstanceType` — default `t3.micro`

### Outputs

- `EC2PublicIP` — Elastic IP, dùng làm `EC2_HOST` trong GitHub Secrets
- `EC2InstanceId` — instance ID

---

## Nginx — Reverse Proxy

Nginx chạy như service trong `docker-compose.yml`. Nginx config tách thành 2 file gần code:

- `backend/nginx/nginx.conf` — reverse proxy HTTPS, xử lý SSL, route `/api/` → backend, route `/` → frontend
- `frontend/nginx.conf` — serve static files nội bộ (không expose ra ngoài)

`infrastructure/nginx/Dockerfile` build nginx image, COPY `backend/nginx/nginx.conf` vào image. SSL dùng self-signed certificate (generate bằng `openssl` trong Dockerfile), phù hợp môi trường test.

### Routing

| Path | Destination |
|---|---|
| `https://<IP>/` | Frontend container (nginx serve static, internal port 80) |
| `https://<IP>/api/` | Backend Node API (port 3000) |
| `http://<IP>` | Redirect → HTTPS |
| `http://<IP>:15672` | RabbitMQ Management (direct, không proxy) |

### docker-compose changes

- Thêm service `nginx` (build từ `infrastructure/nginx/Dockerfile`, ports: 80:80, 443:443)
- Thêm service `frontend` (build từ `frontend/Dockerfile`, dùng `frontend/nginx.conf` serve static, internal only)
- `nginx` depends_on `backend` và `frontend`
- Security Group mở thêm port 443

### Self-signed Certificate

Generate trong `infrastructure/nginx/Dockerfile` lúc build:
```
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout /etc/ssl/private/nginx.key -out /etc/ssl/certs/nginx.crt
```
Client cần bỏ qua SSL verify hoặc add exception (chấp nhận được cho môi trường test).

---

## GitHub Actions — `deploy.yml`

### Trigger

```yaml
on:
  push:
    branches: [test]
  pull_request:
    branches: [test]
```

### Jobs

**deploy** — chỉ chạy khi `push` (skip khi PR):

1. Checkout code
2. Add EC2 host key vào known_hosts
3. Copy SSH key từ secret
4. SSH vào EC2, chạy `deploy.sh`

**deploy.sh trên EC2:**
1. `git pull origin test`
2. `docker compose down`
3. `docker compose up --build -d`
4. Health check: `curl -f http://localhost/api/health` (retry 3 lần)

### GitHub Secrets

| Secret | Giá trị |
|---|---|
| `EC2_SSH_KEY` | Nội dung file `.pem` private key |
| `EC2_HOST` | Elastic IP của EC2 (lấy từ CloudFormation output) |
| `EC2_USER` | `ec2-user` (Amazon Linux 2 default) |

---

## Setup Checklist (sau khi implement)

1. Tạo Key Pair trên AWS Console, download file `.pem`
2. Chạy CloudFormation stack: `aws cloudformation deploy ...`
3. SSH vào EC2 lần đầu: cài Docker + Docker Compose, clone repo
4. Thêm 3 secrets vào GitHub repository settings
5. Push lên branch `test` để trigger deploy lần đầu
