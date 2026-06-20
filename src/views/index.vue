<template>
  <div class="app-container home">
    <div class="hero">
      <div class="hero-icon">
        <img src="@/assets/logo/carecube.jpg" alt="睿立方" class="hero-logo" />
      </div>
      <h1 class="hero-title">睿立方感控AI助手</h1>
      <p class="hero-subtitle">智能感控知识管理平台，高效构建医院感染控制知识体系</p>
    </div>

    <el-row :gutter="24" class="feature-row">
      <el-col :xs="24" :sm="6">
        <div class="feature-card" @click="$router.push('/ai-chat')">
          <el-icon class="feature-icon"><chat-dot-round /></el-icon>
          <h3>AI 助手</h3>
          <p>智能问答助手，快速检索感控知识</p>
        </div>
      </el-col>
      <el-col :xs="24" :sm="6">
        <div class="feature-card" @click="$router.push('/mag/kb')">
          <el-icon class="feature-icon"><folder-opened /></el-icon>
          <h3>知识库管理</h3>
          <p>创建和管理知识库，上传文档构建智能检索</p>
        </div>
      </el-col>
      <el-col :xs="24" :sm="6">
        <div class="feature-card" @click="$router.push('/mag/file/index')">
          <el-icon class="feature-icon"><files /></el-icon>
          <h3>文件管理</h3>
          <p>集中管理所有文件，支持文件夹组织和批量操作</p>
        </div>
      </el-col>
      <el-col :xs="24" :sm="6">
        <div class="feature-card" @click="$router.push('/system/user')">
          <el-icon class="feature-icon"><user /></el-icon>
          <h3>用户管理</h3>
          <p>管理系统用户、角色和权限分配</p>
        </div>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ChatDotRound, FolderOpened, Files, User } from '@element-plus/icons-vue'
</script>

<style scoped lang="scss">
.home {
  max-width: 960px;
  margin: 0 auto;
  padding: 80px 24px;
  font-family: "SF Pro Display", "SF Pro Text", system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
}

.hero {
  text-align: center;
  margin-bottom: 64px;
}

.hero-icon {
  margin-bottom: 24px;
}

.hero-logo {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  box-shadow: 0 4px 24px rgba(0, 102, 204, 0.15);
}

.hero-title {
  font-size: 36px;
  font-weight: 700;
  color: #1d1d1f;
  margin: 0 0 12px;
  letter-spacing: -0.5px;
}

.hero-subtitle {
  font-size: 18px;
  color: #86868b;
  margin: 0;
  font-weight: 400;
}

.feature-row {
  margin-top: 24px;

  :deep(.el-col) {
    display: flex;
  }
}

.feature-card {
  background: #ffffff;
  border: 1px solid #e8e8ed;
  border-radius: 16px;
  padding: 32px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;

  &:hover {
    border-color: #0066cc;
    box-shadow: 0 4px 20px rgba(0, 102, 204, 0.1);
    transform: translateY(-2px);
  }

  .feature-icon {
    font-size: 36px;
    color: #0066cc;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 19px;
    font-weight: 600;
    color: #1d1d1f;
    margin: 0 0 8px;
  }

  p {
    font-size: 14px;
    color: #86868b;
    margin: 0;
    line-height: 1.5;
  }
}
</style>
