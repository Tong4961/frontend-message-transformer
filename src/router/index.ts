import { createRouter, createWebHistory } from 'vue-router'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      component: () => import('@/layouts/MainLayout.vue'),
      redirect: '/converter',
      children: [
        {
          path: 'converter',
          name: 'ConverterList',
          component: () => import('@/views/converter/ConverterList.vue'),
          meta: { title: '转换器管理' }
        },
        {
          path: 'converter/:id/edit',
          name: 'ConverterEdit',
          component: () => import('@/views/converter/ConverterEdit.vue'),
          meta: { title: '编辑转换器' }
        },
        {
          path: 'converter/create',
          name: 'ConverterCreate',
          component: () => import('@/views/converter/ConverterEdit.vue'),
          meta: { title: '创建转换器' }
        },
        {
          path: 'converter/:id/mapping',
          name: 'MappingEditor',
          component: () => import('@/views/converter/MappingEditor.vue'),
          meta: { title: '映射编辑器' }
        },
        {
          path: 'converter/:id/test',
          name: 'TransformTest',
          component: () => import('@/views/converter/TransformTest.vue'),
          meta: { title: '在线测试' }
        },
        {
          path: 'template',
          name: 'TemplateList',
          component: () => import('@/views/template/TemplateList.vue'),
          meta: { title: '模板管理' }
        },
        {
          path: 'template/:id/edit',
          name: 'TemplateEdit',
          component: () => import('@/views/template/TemplateEdit.vue'),
          meta: { title: '编辑模板' }
        },
        {
          path: 'audit',
          name: 'AuditLog',
          component: () => import('@/views/audit/AuditLog.vue'),
          meta: { title: '审计日志' }
        }
      ]
    }
  ]
})

export default router
