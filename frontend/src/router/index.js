// frontend/src/router/index.js
import { createRouter, createWebHistory } from 'vue-router'
import LoginPanel from '../components/LoginPanel.vue'

const routes = [
  {
    path: '/',
    redirect: '/login'
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginPanel
  },
  {
    path: '/chat',
    name: 'Chat',
    component: () => import('../components/ChatView.vue'),
    beforeEnter: (to, from, next) => {
      const token = localStorage.getItem('token')
      if (token) {
        next()
      } else {
        next('/login')
      }
    }
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router