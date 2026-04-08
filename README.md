# 🚀 [ATRI教育智能体]
> 一款基于Yue3和ai agant打造的教育领域专用智能体，集成了最新的GPT-4模型，提供个性化学习辅导、智能答疑和教育资源推荐等功能，助力学生高效学习，教师轻松教学。
![项目预览图](这里贴一张你的项目截图链接，或者在本地放一张图片写 ./preview.png)
## ✨ 功能特性
- 🤖 **多模型支持**：无缝切换 OpenAI (GPT-4/3.5) 等主流大语言模型
- 💬 **流式响应**：采用 Server-Sent Events (SSE) 技术，实现打字机般的输出体验
- 🎨 **精美 UI**：基于 Tailwind CSS 构建，支持亮色/暗色主题切换，完美适配移动端
- 📝 **Markdown 渲染**：完美支持代码高亮、数学公式、表格等复杂格式渲染
- 🚀 **零配置部署**：一键部署至 Vercel，绑定自定义域名，即刻上线
## 🛠️ 技术栈
- **框架**：[Next.js 14](https://nextjs.org/) (App Router)
- ** UI 组件**：[Tailwind CSS](https://tailwindcss.com/) / [shadcn/ui](https://ui.shadcn.com/)
- **AI 接口**：Vercel AI SDK /腾讯云 API *(根据你实际用的改)*
- **部署平台**：[Vercel](https://vercel.com/)
- **包管理器**：pnpm / npm
## 📦 本地开发
想要在本地跑起来这个项目，请按照以下步骤操作：
### 1. 克隆项目
```bash
git clone https://github.com/[你的GitHub用户名]/[你的仓库名].git
cd [你的仓库名]
2. 安装依赖(前后端)
<BASH>
npm install
# 或者如果你用的 pnpm
# pnpm install
3. 配置环境变量
在项目根目录下复制 .env.example 文件，并重命名为 .env.local：

<BASH>
cp .env.example .env.local
在 .env.local 中填入你的密钥：

<ENV>
# 必填：你的 OpenAI API Key
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx
# 可选：其他第三方 API 地址（如果有的话）
OPENAI_BASE_URL=https://api.openai.com/v1
4. 启动后端开发服务器
<BASH>
cd server
node index.js
5. 启动前端开发服务器
cd frontend
npm run dev
6. 打开浏览器访问 http://localhost:5130 即可看到效果。
```
## 🚀 部署
如果你想把这个项目部署到生产环境，请按照以下步骤操作：
### 1. 注册 Vercel 账号
如果你还没有 Vercel 账号，请先注册一个：[https://vercel.com/signup](https://vercel.com/signup)
### 2. 导入项目
登录 Vercel 后，点击左上角的 “New Project” 按钮，然后选择 “Import Project”：


<BASH>
打开浏览器访问 http://localhost:3000 即可看到效果。