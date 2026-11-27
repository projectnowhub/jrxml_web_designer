// The signed-in user (GET /v1/user/me), kept in the browser as
// jrxml_auth_user: read once here, so the home greeting, the account menu and
// "Created by" all show the same name. Sign-in stores it (CallbackView, the
// desktop deep link); every start while signed in reads it again (App.vue),
// so a changed name or a user stored empty is put right.
import { defineStore } from "pinia";
import { computed, ref } from "vue";
import { AUTH_USER_KEY } from "@/services/apiClient";
import { fetchUser } from "@/services/authService";
import type { AuthUser } from "@/types/auth";

const readStoredUser = (): Partial<AuthUser> => {
  try {
    const stored = localStorage.getItem(AUTH_USER_KEY);
    const user = stored ? (JSON.parse(stored) as Partial<AuthUser> | string) : {};
    // A saved web page (a wrong route's answer) is not a user
    return user && typeof user === "object" ? user : {};
  } catch {
    return {};
  }
};

export const useAuthStore = defineStore("auth", () => {
  const user = ref<Partial<AuthUser>>(readStoredUser());

  // First name, as the CDP app's greeting; else the user name or email
  const firstName = computed(
    () => user.value.firstName?.trim() || user.value.username?.trim() || user.value.email?.trim() || "",
  );
  // "First Last" for the account menu and "Created by"
  const fullName = computed(() => {
    const full = [user.value.firstName, user.value.lastName]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" ");
    return full || firstName.value;
  });
  const email = computed(() => user.value.email?.trim() || "");
  // The avatar's letters while it has no picture: the first letters of the
  // first name's first two words, as the CDP app's header (getInitials)
  const initials = computed(() =>
    firstName.value
      .split(/\s+/)
      .slice(0, 2)
      .map((word) => word.charAt(0))
      .join("")
      .toUpperCase(),
  );
  // The user's picture (a fileRef; resolved by useFileUrl in queries/fileQueries.ts)
  const avatar = computed(() => user.value.avatar ?? null);
  // What the account menu shows under the name: job title · company
  const roleLine = computed(() =>
    [user.value.designation?.desigination, user.value.organization?.name]
      .map((part) => part?.trim())
      .filter(Boolean)
      .join(" · "),
  );

  function setUser(next: AuthUser | null) {
    user.value = next ?? {};
    try {
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user.value));
    } catch {
      // The name still shows for this visit
    }
  }

  // Reads the user again (start-up while signed in); a failure keeps the stored one
  async function refresh() {
    try {
      setUser(await fetchUser());
    } catch {
      // Not signed in any more, or offline: the 401 handling takes over
    }
  }

  function forget() {
    user.value = {};
  }

  return { user, firstName, fullName, email, initials, avatar, roleLine, setUser, refresh, forget };
});
