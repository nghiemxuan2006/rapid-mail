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
│   └── nginx.conf             # Reverse proxy config
└── scripts/
    └── deploy.sh              # Deploy script chạy trên EC2

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
| EC2 Instance | Amazon Linux 2, `t2.micro`, KeyPair qua parameter |
| Elastic IP | Gắn cố định vào EC2 |

### Parameters

- `KeyPairName` — tên key pair đã tạo trên AWS
- `InstanceType` — default `t2.micro`

### Outputs

- `EC2PublicIP` — Elastic IP, dùng làm `EC2_HOST` trong GitHub Secrets
- `EC2InstanceId` — instance ID

---

## Nginx — Reverse Proxy

Nginx chạy như service trong `docker-compose.yml`. Frontend có `Dockerfile` riêng: build React (`npm run build`) → copy `dist/` vào Nginx image.

### Routing

| Path | Destination |
|---|---|
| `http://<IP>/` | Frontend static (React build) |
| `http://<IP>/api/` | Backend Node API (port 3000) |
| `http://<IP>:15672` | RabbitMQ Management (direct, không proxy) |

### docker-compose changes

- Thêm service `nginx` (image: nginx:alpine, ports: 80:80)
- Thêm service `frontend` (build từ `../frontend/Dockerfile`)
- `nginx` depends_on `backend` và `frontend`

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
