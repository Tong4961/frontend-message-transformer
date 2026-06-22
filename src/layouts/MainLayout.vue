<template>
  <el-container class="layout-container">
    <!-- Sidebar -->
    <el-aside :width="isCollapse ? '64px' : '220px'" class="sidebar">
      <div class="logo" @click="isCollapse = !isCollapse">
        <el-icon :size="24"><DataBoard /></el-icon>
        <span v-show="!isCollapse" class="logo-text">消息转换平台</span>
      </div>
      <el-menu
        :default-active="activeMenu"
        :collapse="isCollapse"
        router
        background-color="#1d1e2c"
        text-color="#a3a6b4"
        active-text-color="#409eff"
        class="sidebar-menu"
      >
        <el-menu-item index="/converter">
          <el-icon><Connection /></el-icon>
          <template #title>转换器管理</template>
        </el-menu-item>
        <el-menu-item index="/template">
          <el-icon><Document /></el-icon>
          <template #title>模板管理</template>
        </el-menu-item>
        <el-menu-item index="/audit">
          <el-icon><Notebook /></el-icon>
          <template #title>审计日志</template>
        </el-menu-item>
      </el-menu>
    </el-aside>

    <!-- Main Content -->
    <el-container>
      <el-header class="header">
        <div class="header-left">
          <el-breadcrumb separator="/">
            <el-breadcrumb-item :to="{ path: '/' }">首页</el-breadcrumb-item>
            <el-breadcrumb-item>{{ currentTitle }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="header-right">
          <el-switch
            v-model="isDark"
            inline-prompt
            :active-icon="Moon"
            :inactive-icon="Sunny"
            @change="toggleDark"
            style="margin-right: 16px"
          />
          <el-avatar :size="32" icon="UserFilled" />
        </div>
      </el-header>
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useRoute } from 'vue-router'
import { Moon, Sunny } from '@element-plus/icons-vue'

const route = useRoute()
const isCollapse = ref(false)
const isDark = ref(false)

const activeMenu = computed(() => {
  const path = route.path
  if (path.startsWith('/converter')) return '/converter'
  if (path.startsWith('/template')) return '/template'
  if (path.startsWith('/audit')) return '/audit'
  return path
})

const currentTitle = computed(() => (route.meta?.title as string) || '')

const toggleDark = (val: boolean) => {
  document.documentElement.classList.toggle('dark', val)
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
}

.sidebar {
  background: #1d1e2c;
  transition: width 0.3s;
  overflow: hidden;
}

.logo {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  border-bottom: 1px solid #2d2e3e;
}

.logo-text {
  white-space: nowrap;
}

.sidebar-menu {
  border-right: none;
}

.sidebar-menu:not(.el-menu--collapse) {
  width: 220px;
}

.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid #e4e7ed;
  background: #fff;
  padding: 0 20px;
}

.header-right {
  display: flex;
  align-items: center;
}

.main-content {
  background: #f0f2f5;
  padding: 16px;
  overflow-y: auto;
  height: calc(100vh - 56px);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
