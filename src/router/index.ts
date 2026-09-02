import { createRouter, createWebHistory } from "vue-router";
import LoginView from "../views/LoginView.vue";
import CallbackView from "../views/CallbackView.vue";
import HomeView from "../views/HomeView.vue";
import PDFDesigner from "../components/PDFDesigner.vue";
import { isAuthenticated } from "../utils/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: HomeView,
      meta: { requiresAuth: true },
    },
    {
      path: "/login",
      name: "login",
      component: LoginView,
    },
    {
      path: "/callback",
      name: "callback",
      component: CallbackView,
    },
    {
      path: "/designer",
      name: "designer",
      component: PDFDesigner,
      meta: { requiresAuth: true },
    },
  ],
});

router.beforeEach((to, _from) => {
  const requiresAuth = to.meta.requiresAuth === true;
  const loggedIn = isAuthenticated();

  if (requiresAuth && !loggedIn) {
    return '/login';
  }

  if (to.path === "/login" && loggedIn) {
    return "/";
  }

  return true;
});

export default router;
