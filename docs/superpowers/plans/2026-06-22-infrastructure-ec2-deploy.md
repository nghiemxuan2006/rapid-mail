# Infrastructure EC2 Deploy Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Tạo infrastructure/ với CloudFormation EC2, Nginx HTTPS reverse proxy, và GitHub Actions auto-deploy khi push/PR vào branch `test`.

**Architecture:** CloudFormation provision 1 EC2 (t3.micro, Amazon Linux 2) với Elastic IP. Docker Compose chạy toàn bộ stack (mongodb, rabbitmq, backend, worker, frontend, nginx). Nginx đứng trước làm reverse proxy HTTPS với self-signed cert, serve frontend static và proxy /api/ sang backend.

**Tech Stack:** AWS CloudFormation, EC2 Amazon Linux 2, Docker, Docker Compose, Nginx, GitHub Actions, openssl (self-signed cert)

## Global Constraints

- EC2 instance type: `t3.micro`
- OS: Amazon Linux 2 (AMI ID per region — dùng SSM Parameter `/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2`)
- Docker Compose v2 (`docker compose`, không phải `docker-compose`)
- Branch deploy: `test`
- HTTPS self-signed cert, 365 ngày, RSA 2048
- Health check endpoint: `https://localhost/api/health`
- GitHub Secrets: `EC2_SSH_KEY`, `EC2_HOST`, `EC2_USER`

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `infrastructure/cloudformation/ec2-stack.yml` | Create | Provision VPC, Subnet, IGW, SG, EC2, EIP |
| `infrastructure/nginx/Dockerfile` | Create | Build Nginx image với self-signed cert, COPY backend/nginx/nginx.conf |
| `infrastructure/scripts/deploy.sh` | Create | Script chạy trên EC2: git pull + docker compose up |
| `backend/nginx/nginx.conf` | Create | Reverse proxy HTTPS config: SSL, route `/` → frontend, `/api/` → backend |
| `frontend/Dockerfile` | Create | Build React → copy dist/ vào nginx:alpine, dùng frontend/nginx.conf |
| `frontend/nginx.conf` | Create | Serve static files nội bộ (internal only, không HTTPS) |
| `backend/docker-compose.yml` | Modify | Thêm service nginx, frontend; update ports |
| `.github/workflows/deploy.yml` | Create | CI/CD workflow trigger on push/PR to test |

---

### Task 1: CloudFormation EC2 Stack

**Files:**
- Create: `infrastructure/cloudformation/ec2-stack.yml`

**Interfaces:**
- Produces: CloudFormation stack với output `EC2PublicIP` và `EC2InstanceId`

- [ ] **Step 1: Tạo thư mục và file**

```bash
mkdir -p infrastructure/cloudformation
```

- [ ] **Step 2: Viết CloudFormation template**

Tạo file `infrastructure/cloudformation/ec2-stack.yml`:

```yaml
AWSTemplateFormatVersion: '2010-09-09'
Description: Rapid Mail EC2 test environment

Parameters:
  KeyPairName:
    Type: AWS::EC2::KeyPair::KeyName
    Description: Tên key pair EC2 để SSH
  InstanceType:
    Type: String
    Default: t3.micro
    AllowedValues: [t3.micro, t3.small, t3.medium]

Resources:
  VPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16
      EnableDnsHostnames: true
      EnableDnsSupport: true
      Tags:
        - Key: Name
          Value: rapid-mail-vpc

  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref VPC
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true
      Tags:
        - Key: Name
          Value: rapid-mail-public-subnet

  InternetGateway:
    Type: AWS::EC2::InternetGateway
    Properties:
      Tags:
        - Key: Name
          Value: rapid-mail-igw

  VPCGatewayAttachment:
    Type: AWS::EC2::VPCGatewayAttachment
    Properties:
      VpcId: !Ref VPC
      InternetGatewayId: !Ref InternetGateway

  RouteTable:
    Type: AWS::EC2::RouteTable
    Properties:
      VpcId: !Ref VPC
      Tags:
        - Key: Name
          Value: rapid-mail-route-table

  PublicRoute:
    Type: AWS::EC2::Route
    DependsOn: VPCGatewayAttachment
    Properties:
      RouteTableId: !Ref RouteTable
      DestinationCidrBlock: 0.0.0.0/0
      GatewayId: !Ref InternetGateway

  SubnetRouteTableAssociation:
    Type: AWS::EC2::SubnetRouteTableAssociation
    Properties:
      SubnetId: !Ref PublicSubnet
      RouteTableId: !Ref RouteTable

  SecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: Rapid Mail security group
      VpcId: !Ref VPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 22
          ToPort: 22
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 443
          ToPort: 443
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 15672
          ToPort: 15672
          CidrIp: 0.0.0.0/0
      Tags:
        - Key: Name
          Value: rapid-mail-sg

  EC2Instance:
    Type: AWS::EC2::Instance
    Properties:
      InstanceType: !Ref InstanceType
      KeyName: !Ref KeyPairName
      ImageId: '{{resolve:ssm:/aws/service/ami-amazon-linux-latest/amzn2-ami-hvm-x86_64-gp2}}'
      SubnetId: !Ref PublicSubnet
      SecurityGroupIds:
        - !Ref SecurityGroup
      Tags:
        - Key: Name
          Value: rapid-mail-ec2

  ElasticIP:
    Type: AWS::EC2::EIP
    Properties:
      InstanceId: !Ref EC2Instance
      Tags:
        - Key: Name
          Value: rapid-mail-eip

Outputs:
  EC2PublicIP:
    Description: Elastic IP của EC2 — dùng làm EC2_HOST trong GitHub Secrets
    Value: !Ref ElasticIP
    Export:
      Name: RapidMailEC2PublicIP

  EC2InstanceId:
    Description: EC2 Instance ID
    Value: !Ref EC2Instance
    Export:
      Name: RapidMailEC2InstanceId
```

- [ ] **Step 3: Validate template (cần AWS CLI)**

```bash
aws cloudformation validate-template --template-body file://infrastructure/cloudformation/ec2-stack.yml
```

Expected: JSON response không có error.

- [ ] **Step 4: Commit**

```bash
git add infrastructure/cloudformation/ec2-stack.yml
git commit -m "feat(infra): add CloudFormation EC2 stack template"
```

---

### Task 2: Frontend Dockerfile và nginx.conf

**Files:**
- Create: `frontend/Dockerfile`
- Create: `frontend/nginx.conf`

**Interfaces:**
- Produces: Docker image với React build served bởi nginx tại internal port 80 (không expose ra ngoài)

- [ ] **Step 1: Tạo frontend/nginx.conf**

Tạo file `frontend/nginx.conf`:

```nginx
server {
    listen 80;

    root /usr/share/nginx/html;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

- [ ] **Step 2: Tạo frontend/Dockerfile**

Tạo file `frontend/Dockerfile`:

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Build thử locally để verify**

```bash
cd frontend
docker build -t rapid-mail-frontend .
```

Expected: Build thành công, không có error.

- [ ] **Step 4: Commit**

```bash
git add frontend/Dockerfile frontend/nginx.conf
git commit -m "feat(frontend): add Dockerfile and nginx config for static build"
```

---

### Task 3: Nginx Reverse Proxy với HTTPS

**Files:**
- Create: `backend/nginx/nginx.conf`
- Create: `infrastructure/nginx/Dockerfile`

**Interfaces:**
- Consumes: `frontend` container tại hostname `frontend:80`, `backend` container tại hostname `backend:3000`
- Produces: HTTPS endpoint port 443, HTTP redirect port 80

- [ ] **Step 1: Tạo backend/nginx/nginx.conf**

Tạo file `backend/nginx/nginx.conf`:

```nginx
server {
    listen 80;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;

    ssl_certificate /etc/ssl/certs/nginx.crt;
    ssl_certificate_key /etc/ssl/private/nginx.key;

    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://frontend:80;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /api/ {
        proxy_pass http://backend:3000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-Proto https;
    }
}
```

- [ ] **Step 2: Tạo infrastructure/nginx/Dockerfile**

Tạo file `infrastructure/nginx/Dockerfile`:

```dockerfile
FROM nginx:alpine

RUN apk add --no-cache openssl

RUN openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
    -keyout /etc/ssl/private/nginx.key \
    -out /etc/ssl/certs/nginx.crt \
    -subj "/C=VN/ST=HCM/L=HoChiMinh/O=RapidMail/CN=localhost"

COPY ../../backend/nginx/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80 443
CMD ["nginx", "-g", "daemon off;"]
```

- [ ] **Step 3: Commit**

```bash
git add backend/nginx/nginx.conf infrastructure/nginx/Dockerfile
git commit -m "feat(infra): add Nginx HTTPS reverse proxy with self-signed cert"
```

---

### Task 4: Cập nhật docker-compose.yml

**Files:**
- Modify: `backend/docker-compose.yml`

**Interfaces:**
- Consumes: `infrastructure/nginx/Dockerfile`, `frontend/Dockerfile`
- Produces: Full stack gồm mongodb, rabbitmq, backend, worker, frontend, nginx

- [ ] **Step 1: Thêm service frontend và nginx vào docker-compose.yml**

Mở `backend/docker-compose.yml`, thêm 2 services sau vào phần `services:`:

```yaml
  frontend:
    build:
      context: ../frontend
      dockerfile: Dockerfile
    container_name: rapid-mail-frontend
    restart: unless-stopped
    networks:
      - rapid-mail-network

  nginx:
    build:
      context: ../infrastructure/nginx
      dockerfile: Dockerfile
    container_name: rapid-mail-nginx
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    depends_on:
      - backend
      - frontend
    networks:
      - rapid-mail-network
```

- [ ] **Step 2: Xóa port mapping 3000:3000 của backend service** (không cần expose ra ngoài nữa)

Trong service `backend`, xóa hoặc comment dòng:
```yaml
    ports:
      - "3000:3000"
```

- [ ] **Step 3: Build thử toàn bộ stack**

```bash
cd backend
docker compose build
```

Expected: Tất cả images build thành công.

- [ ] **Step 4: Commit**

```bash
git add backend/docker-compose.yml
git commit -m "feat(infra): add nginx and frontend services to docker-compose"
```

---

### Task 5: Deploy Script

**Files:**
- Create: `infrastructure/scripts/deploy.sh`

**Interfaces:**
- Produces: Script chạy trên EC2, pull code mới và restart stack

- [ ] **Step 1: Tạo thư mục và script**

```bash
mkdir -p infrastructure/scripts
```

Tạo file `infrastructure/scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

REPO_DIR="/home/ec2-user/rapid-mail"
COMPOSE_FILE="$REPO_DIR/backend/docker-compose.yml"

echo "=== Pulling latest code ==="
cd "$REPO_DIR"
git pull origin test

echo "=== Stopping existing containers ==="
docker compose -f "$COMPOSE_FILE" down

echo "=== Building and starting containers ==="
docker compose -f "$COMPOSE_FILE" up --build -d

echo "=== Waiting for services to start ==="
sleep 10

echo "=== Health check ==="
for i in 1 2 3; do
  if curl -k -f https://localhost/api/health; then
    echo "Health check passed"
    exit 0
  fi
  echo "Attempt $i failed, retrying in 5s..."
  sleep 5
done

echo "Health check failed after 3 attempts"
exit 1
```

- [ ] **Step 2: Chmod script**

```bash
chmod +x infrastructure/scripts/deploy.sh
```

- [ ] **Step 3: Commit**

```bash
git add infrastructure/scripts/deploy.sh
git commit -m "feat(infra): add deploy script for EC2"
```

---

### Task 6: GitHub Actions Workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

**Interfaces:**
- Consumes: GitHub Secrets `EC2_SSH_KEY`, `EC2_HOST`, `EC2_USER`
- Produces: Auto-deploy khi push vào branch `test`

- [ ] **Step 1: Tạo thư mục**

```bash
mkdir -p .github/workflows
```

- [ ] **Step 2: Tạo workflow file**

Tạo file `.github/workflows/deploy.yml`:

```yaml
name: Deploy to EC2

on:
  push:
    branches: [test]
  pull_request:
    branches: [test]

jobs:
  deploy:
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup SSH key
        run: |
          mkdir -p ~/.ssh
          echo "${{ secrets.EC2_SSH_KEY }}" > ~/.ssh/id_rsa
          chmod 600 ~/.ssh/id_rsa

      - name: Add EC2 to known hosts
        run: |
          ssh-keyscan -H ${{ secrets.EC2_HOST }} >> ~/.ssh/known_hosts

      - name: Deploy to EC2
        run: |
          ssh ${{ secrets.EC2_USER }}@${{ secrets.EC2_HOST }} \
            "bash /home/ec2-user/rapid-mail/infrastructure/scripts/deploy.sh"
```

- [ ] **Step 3: Commit và push**

```bash
git add .github/workflows/deploy.yml
git commit -m "feat(ci): add GitHub Actions deploy workflow for branch test"
```

---

### Task 7: EC2 First-Time Bootstrap (Manual — thực hiện 1 lần)

Đây là các bước thủ công cần làm 1 lần sau khi CloudFormation tạo xong EC2. Không có code, chỉ có lệnh shell.

- [ ] **Step 1: Deploy CloudFormation stack**

```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/ec2-stack.yml \
  --stack-name rapid-mail-test \
  --parameter-overrides KeyPairName=<tên-key-pair-của-bạn> \
  --region ap-southeast-1
```

Lấy Elastic IP:
```bash
aws cloudformation describe-stacks \
  --stack-name rapid-mail-test \
  --query "Stacks[0].Outputs[?OutputKey=='EC2PublicIP'].OutputValue" \
  --output text
```

- [ ] **Step 2: SSH vào EC2 và cài Docker**

```bash
ssh -i <path-to-key.pem> ec2-user@<EC2_PUBLIC_IP>

# Trên EC2:
sudo yum update -y
sudo yum install -y docker git
sudo systemctl enable docker
sudo systemctl start docker
sudo usermod -aG docker ec2-user

# Cài Docker Compose v2
sudo mkdir -p /usr/local/lib/docker/cli-plugins
sudo curl -SL https://github.com/docker/compose/releases/download/v2.24.0/docker-compose-linux-x86_64 \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
sudo chmod +x /usr/local/lib/docker/cli-plugins/docker-compose

# Logout và SSH lại để group docker có hiệu lực
exit
```

- [ ] **Step 3: Clone repo trên EC2**

```bash
ssh -i <path-to-key.pem> ec2-user@<EC2_PUBLIC_IP>

# Trên EC2:
git clone https://github.com/<your-org>/rapid-mail.git /home/ec2-user/rapid-mail
cd /home/ec2-user/rapid-mail
git checkout test
```

- [ ] **Step 4: Tạo file .env trên EC2**

```bash
# Copy .env từ máy local lên EC2:
scp -i <path-to-key.pem> backend/.env ec2-user@<EC2_PUBLIC_IP>:/home/ec2-user/rapid-mail/backend/.env
```

- [ ] **Step 5: Thêm GitHub Secrets**

Vào GitHub repo → Settings → Secrets and variables → Actions → New repository secret:

| Name | Value |
|---|---|
| `EC2_SSH_KEY` | Nội dung file `.pem` (copy toàn bộ kể cả `-----BEGIN RSA PRIVATE KEY-----`) |
| `EC2_HOST` | Elastic IP lấy từ Step 1 |
| `EC2_USER` | `ec2-user` |

- [ ] **Step 6: Test deploy lần đầu**

```bash
# Push bất kỳ thay đổi nhỏ lên branch test để trigger workflow
git checkout test
git push origin test
```

Vào GitHub Actions tab theo dõi workflow chạy. Sau khi pass, kiểm tra:
```bash
curl -k https://<EC2_PUBLIC_IP>/
curl -k https://<EC2_PUBLIC_IP>/api/health
```

---

## Self-Review

**Spec coverage:**
- CloudFormation với đủ resources (VPC, SG, EC2, EIP) ✓
- t3.micro ✓
- Nginx HTTPS self-signed cert ✓
- Routing: `/` → frontend, `/api/` → backend, port 80 redirect → 443 ✓
- GitHub Actions trigger push + PR vào branch `test`, deploy chỉ khi push ✓
- deploy.sh với git pull + docker compose up + health check ✓
- Frontend Dockerfile build static ✓
- First-time EC2 bootstrap checklist ✓

**Placeholder scan:** Không có TBD/TODO. Tất cả steps đều có lệnh cụ thể.

**Type consistency:** Không có shared types giữa các tasks — infrastructure config, không có code phụ thuộc lẫn nhau.
