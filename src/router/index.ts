import { createRouter, createWebHistory } from "vue-router";
import {
  HomeView,
  LoginView,
  MyProfileView,
  CallbackView,
  DesktopLoginView,
  MyTemplatesView,
  ActivityView,
} from "../views";
import { PDFDesigner, AppLayout } from "../components";

import { isAuthenticated } from "../utils/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      component: AppLayout,
      meta: { requiresAuth: true },
      children: [
        {
          path: "",
          name: "home",
          component: HomeView,
        },
        {
          path: "myprofile",
          name: "myprofile",
          component: MyProfileView,
        },
        {
          path: "mytemplates",
          name: "mytemplates",
          component: MyTemplatesView,
        },
        {
          path: "activity",
          name: "activity",
          component: ActivityView,
        },

      ],
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
      path: "/desktop-login",
      name: "desktop-login",
      component: DesktopLoginView,
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
    return "/login";
  }

  if (to.path === "/login" && loggedIn) {
    return "/";
  }

  return true;
});

export default router;
