# Git 上传 / 另一台电脑下载

## 这台 Mac 当前状态

命令行 `git` 需要先安装 **Xcode Command Line Tools**。在终端运行：

```bash
xcode-select --install
```

弹出窗口后点「安装」，完成后再执行下面的步骤。

## 方式 A：推送到 GitHub（推荐）

### 1. 在本机初始化并提交

```bash
cd ~/Downloads/RedotPay-KOL-BD

git init
git add .
git commit -m "Initial commit: KOL BD workflow, scripts, and master queues"
```

### 2. 在 GitHub 新建私有仓库

浏览器打开 https://github.com/new ，仓库名例如 `RedotPay-KOL-BD`，选 **Private**。

### 3. 推送

```bash
git branch -M main
git remote add origin git@github.com:YOUR_USERNAME/RedotPay-KOL-BD.git
git push -u origin main
```

（HTTPS 也可以：`https://github.com/YOUR_USERNAME/RedotPay-KOL-BD.git`）

### 4. 另一台电脑克隆

```bash
git clone git@github.com:YOUR_USERNAME/RedotPay-KOL-BD.git
cd RedotPay-KOL-BD
cp .env.example .env.local
# 编辑 .env.local，填入 YTK_API_KEY（不要提交到 Git）
```

## 方式 B：直接用压缩包（无需 Git）

已生成 `RedotPay-KOL-BD.zip`（在 Downloads 目录）。AirDrop / 网盘 / U 盘拷到另一台电脑，解压即可。

同样记得单独配置 `.env.local`（API Key 不在压缩包的安全考虑范围内，需从原 `.agents/skills/.../.env.local` 复制）。

## 克隆后必做

1. 复制 API 配置：`cp .env.example .env.local` 并填入 Key  
2. 安装 Node.js（脚本用 `node creator-data/scripts/...`）  
3. NoxInfluencer skill 若另一台也有 Cursor，按原路径配置即可

## 不会进 Git 的文件

见 `.gitignore`：`.env.local`、密钥、 `node_modules/` 等。
