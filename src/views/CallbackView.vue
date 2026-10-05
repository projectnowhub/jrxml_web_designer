<template>
  <div
    class="fixed inset-0 overflow-hidden bg-bg flex flex-col select-none"
    style="z-index: 50"
  >
    <div
      class="cb-grid absolute inset-0 pointer-events-none"
      style="
        background-image:
          linear-gradient(hsl(var(--i0) / 0.05) 1px, transparent 1px),
          linear-gradient(90deg, hsl(var(--i0) / 0.05) 1px, transparent 1px);
        background-size: 48px 48px;
      "
    />

    <div
      class="cb-orb-a absolute pointer-events-none rounded-full"
      style="
        top: -12%;
        left: -8%;
        width: 760px;
        height: 760px;
        background: radial-gradient(
          circle,
          var(--a-30, rgba(99, 102, 241, 0.24)) 0%,
          transparent 65%
        );
        opacity: 0.55;
      "
    />
    <div
      class="cb-orb-b absolute pointer-events-none rounded-full"
      style="
        bottom: -18%;
        right: -10%;
        width: 860px;
        height: 860px;
        background: radial-gradient(
          circle,
          var(--a-18, rgba(99, 102, 241, 0.15)) 0%,
          transparent 65%
        );
        opacity: 0.45;
      "
    />
    <div
      class="absolute pointer-events-none rounded-full"
      style="
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 700px;
        height: 480px;
        background: radial-gradient(
          ellipse,
          var(--a-10, rgba(99, 102, 241, 0.08)) 0%,
          transparent 70%
        );
      "
    />

    <div class="absolute inset-0 pointer-events-none overflow-hidden">
      <div
        v-for="(p, i) in ptcls"
        :key="i"
        class="cb-ptcl absolute rounded-full"
        :style="{
          left: p.l,
          bottom: '18%',
          width: p.sz + 'px',
          height: p.sz + 'px',
          background: 'var(--a)',
          animationDuration: p.dur,
          animationDelay: p.delay,
        }"
      />
    </div>

    <div
      class="absolute top-0 right-0 overflow-hidden pointer-events-none"
      style="width: 340px; height: 340px; opacity: 0.07"
      aria-hidden="true"
    >
      <span
        class="absolute rounded-full"
        style="width: 560px; height: 560px; left: 60px; top: -280px; border: 1px solid var(--a)"
      />
      <span
        class="absolute rounded-full"
        style="width: 400px; height: 400px; left: 140px; top: -200px; border: 1px solid var(--a)"
      />
      <span
        class="absolute rounded-full"
        style="width: 240px; height: 240px; left: 220px; top: -120px; border: 1px solid var(--a)"
      />
    </div>

    <div
      class="absolute bottom-0 left-0 overflow-hidden pointer-events-none"
      style="width: 280px; height: 280px; opacity: 0.07"
      aria-hidden="true"
    >
      <span
        class="absolute rounded-full"
        style="width: 480px; height: 480px; left: -240px; top: 40px; border: 1px solid var(--a)"
      />
      <span
        class="absolute rounded-full"
        style="width: 320px; height: 320px; left: -160px; top: 120px; border: 1px solid var(--a)"
      />
    </div>

    <header
      class="cb-hdr relative z-10 flex-shrink-0 flex items-center justify-between px-8"
      style="height: 64px; animation-delay: 0s"
    >
      <div class="flex items-center gap-2.5">
        <div
          class="w-7 h-7 rounded-lg flex items-center justify-center"
          style="
            background: var(--a-18, rgba(99, 102, 241, 0.15));
            border: 1px solid var(--a-30, rgba(99, 102, 241, 0.25));
          "
        >
          <img src="/assets/cdp-logo.png" alt="" class="w-4 h-4 object-contain" />
        </div>
        <span class="text-sm font-semibold text-i1 tracking-tight"
          >ProjectNow CDP</span
        >
      </div>

      <div
        class="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-medium text-i2"
        style="background: hsl(var(--s2)); border: 1px solid var(--b1)"
      >
        <span
          class="w-1.5 h-1.5 rounded-full"
          style="
            background: var(--green, #22c55e);
            box-shadow: 0 0 6px var(--green, #22c55e);
          "
        />
        {{ t("callback.secureConnection") }}
      </div>
    </header>

    <main
      class="relative z-10 flex-1 flex flex-col items-center justify-center px-4 gap-7 pb-4"
    >
      <div
        class="cb-fade relative flex items-center justify-center"
        style="width: 168px; height: 168px; animation-delay: 0.1s"
      >
        <div
          class="cb-pulse absolute inset-0 rounded-full"
          style="border: 1.5px solid var(--a); opacity: 0.55"
        />
        <div
          class="cb-pulse absolute inset-0 rounded-full"
          style="
            border: 1px solid var(--a);
            opacity: 0.35;
            animation-delay: 0.8s;
          "
        />

        <div class="cb-spin absolute inset-0">
          <div class="relative w-full h-full" aria-hidden="true">
            <span
              class="absolute rounded-full"
              style="inset: 6px; border: 1.4px dashed var(--a); opacity: .45"
            />
            <span
              class="absolute rounded-full"
              style="width: 8px; height: 8px; left: 50%; top: 50%; margin: -4px; background: var(--a); opacity: .85; transform: rotate(0deg) translateY(-78px)"
            />
            <span
              class="absolute rounded-full"
              style="width: 8px; height: 8px; left: 50%; top: 50%; margin: -4px; background: var(--a); opacity: .85; transform: rotate(120deg) translateY(-78px)"
            />
            <span
              class="absolute rounded-full"
              style="width: 8px; height: 8px; left: 50%; top: 50%; margin: -4px; background: var(--a); opacity: .85; transform: rotate(240deg) translateY(-78px)"
            />
          </div>
        </div>

        <div class="cb-rspin absolute" style="inset: 18px">
          <div class="relative w-full h-full" aria-hidden="true">
            <span
              class="absolute rounded-full"
              style="inset: 6px; border: 1px dashed var(--a); opacity: .3"
            />
            <span
              class="absolute rounded-full"
              style="width: 5.0px; height: 5.0px; left: 50%; top: 50%; margin: -2.5px; background: var(--a); opacity: .5; transform: rotate(60deg) translateY(-60px)"
            />
            <span
              class="absolute rounded-full"
              style="width: 5.0px; height: 5.0px; left: 50%; top: 50%; margin: -2.5px; background: var(--a); opacity: .5; transform: rotate(300deg) translateY(-60px)"
            />
          </div>
        </div>

        <div class="cb-spin2 absolute" style="inset: 36px">
          <div class="relative w-full h-full" aria-hidden="true">
            <span
              class="absolute rounded-full"
              style="inset: 4px; border: 0.8px dotted var(--a); opacity: .2"
            />
          </div>
        </div>

        <div
          class="relative z-10 flex items-center justify-center rounded-2xl overflow-hidden"
          style="
            width: 72px;
            height: 72px;
            background: linear-gradient(
              145deg,
              var(--a-18, rgba(99, 102, 241, 0.18)) 0%,
              var(--a-10, rgba(99, 102, 241, 0.08)) 100%
            );
            border: 1px solid var(--a-30, rgba(99, 102, 241, 0.28));
            box-shadow: 0 0 32px -6px var(--a-18, rgba(99, 102, 241, 0.25));
          "
        >
          <div
            class="cb-scan absolute left-0 w-full pointer-events-none"
            style="
              height: 2px;
              background: linear-gradient(
                90deg,
                transparent,
                var(--a),
                transparent
              );
            "
          />
          <ShieldCheck :size="34" :stroke-width="1.5" style="color: var(--a)" aria-hidden="true" />
        </div>
      </div>

      <div class="cb-fade text-center" style="animation-delay: 0.22s">
        <h1
          class="cb-shimmer text-[26px] font-bold tracking-tight leading-tight"
        >
          {{ t("callback.securingSession") }}
        </h1>
        <p
          class="mt-1.5 text-[13.5px] text-i2 max-w-xs mx-auto leading-relaxed"
        >
          {{ t("callback.securingSessionDescription") }}
        </p>
      </div>

      <div
        class="cb-fade w-full"
        style="
          max-width: 480px;
          animation-delay: 0.36s;
          border-radius: 14px;
          overflow: hidden;
          background: hsl(var(--s1));
          border: 1px solid var(--b1);
          box-shadow:
            0 8px 32px -8px rgba(0, 0, 0, 0.18),
            0 0 0 1px var(--b0);
        "
      >
        <div
          v-for="(step, index) in steps"
          :key="step.label"
          class="cb-step flex items-center gap-4 px-5 py-4"
          :style="{
            animationDelay: step.delay,
            background:
              step.state === 'active'
                ? 'var(--a-10,rgba(99,102,241,.07))'
                : undefined,
            borderBottom:
              index < steps.length - 1 ? '1px solid var(--b0)' : undefined,
          }"
        >
          <span class="flex-shrink-0">
            <component
              :is="step.icon"
              :size="16"
              :class="step.iconClass"
              :style="{ color: step.iconColor, display: 'block' }"
              aria-hidden="true"
            />
          </span>

          <div class="flex-1 min-w-0">
            <div
              class="text-[13px] font-medium leading-snug"
              :style="{
                color:
                  step.state === 'done'
                    ? 'var(--green,#22c55e)'
                    : step.state === 'active'
                      ? 'hsl(var(--i0))'
                      : 'hsl(var(--i3))',
              }"
            >
              {{ step.label }}
            </div>
            <div class="text-[11px] text-i3 mt-0.5">{{ step.sub }}</div>
          </div>

          <span
            v-if="step.state === 'done'"
            class="flex-shrink-0 flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
            style="
              color: var(--green, #22c55e);
              background: var(--green-bg, rgba(34, 197, 94, 0.1));
              border: 1px solid rgba(34, 197, 94, 0.2);
            "
          >
            <Check :size="11" :stroke-width="2.5" aria-hidden="true" /> {{ t("callback.done") }}
          </span>

          <span
            v-else-if="step.state === 'active'"
            class="flex-shrink-0 flex items-center gap-1 text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
            style="
              color: var(--a);
              background: var(--a-10, rgba(99, 102, 241, 0.1));
              border: 1px solid var(--a-18, rgba(99, 102, 241, 0.2));
            "
          >
            {{ t("callback.active") }}
          </span>
        </div>
      </div>

      <div
        class="cb-fade w-full"
        style="max-width: 480px; animation-delay: 0.5s"
      >
        <div class="flex justify-between items-center mb-2">
          <span class="text-[11.5px] text-i3 font-medium"
            >{{ t("callback.authProgress") }}</span
          >
          <span class="text-[11.5px] font-bold" style="color: var(--a)"
            >62%</span
          >
        </div>
        <div
          class="w-full h-2 rounded-full overflow-hidden"
          style="background: hsl(var(--s3))"
        >
          <div
            class="cb-bar h-full rounded-full"
            style="
              background: linear-gradient(
                90deg,
                var(--a),
                var(--a-hi, var(--a))
              );
              box-shadow: 0 0 10px 1px var(--a-18, rgba(99, 102, 241, 0.4));
            "
          />
        </div>
      </div>

      <div
        class="cb-fade flex items-center gap-2"
        style="animation-delay: 0.62s"
      >
        <div class="cb-d1 w-2 h-2 rounded-full" style="background: var(--a)" />
        <div class="cb-d2 w-2 h-2 rounded-full" style="background: var(--a)" />
        <div class="cb-d3 w-2 h-2 rounded-full" style="background: var(--a)" />
      </div>
    </main>

    <footer
      class="cb-hdr relative z-10 flex-shrink-0 flex items-center justify-center gap-6"
      style="height: 56px; animation-delay: 0.15s"
    >
      <div class="flex items-center gap-1.5 text-[11px] text-i3">
        <Lock :size="11" aria-hidden="true" />
        <span>{{ t("callback.pkceSecured") }}</span>
      </div>
      <div class="w-px h-3 bg-b1" />
      <div class="flex items-center gap-1.5 text-[11px] text-i3">
        <Check :size="11" :stroke-width="2.5" aria-hidden="true" />
        <span>{{ t("callback.endToEndEncrypted") }}</span>
      </div>
      <div class="w-px h-3 bg-b1" />
      <div
        class="cb-conn flex items-center gap-1.5 text-[11px]"
        style="color: var(--green, #22c55e)"
      >
        <span
          class="w-1.5 h-1.5 rounded-full"
          style="background: var(--green, #22c55e)"
        />
        <span>{{ t("callback.secureChannelActive") }}</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import {
  Check,
  CircleCheck,
  CircleDot,
  LoaderCircle,
  Lock,
  ShieldCheck,
} from "@lucide/vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { exchangeCode, fetchUser } from "../services/authService";
import { closeTab } from "../utils/closeTab";
import { AUTH_TOKEN_KEY, AUTH_USER_KEY } from "../services/apiClient";

const { t } = useI18n();
const router = useRouter();
const status = ref("Verifying your credentials...");

const ptcls = [
  { l: "18%", sz: 3, dur: "3.4s", delay: "0s" },
  { l: "32%", sz: 2, dur: "4.2s", delay: ".9s" },
  { l: "50%", sz: 4, dur: "3.8s", delay: "1.5s" },
  { l: "68%", sz: 2, dur: "4.9s", delay: ".4s" },
  { l: "82%", sz: 3, dur: "3.2s", delay: "2.1s" },
];

const steps = computed(() => [
  {
    icon: CircleCheck,
    iconColor: "var(--green,#22c55e)",
    iconClass: undefined,
    label: t("callback.authCodeReceived"),
    sub: t("callback.pkceCodeVerified"),
    state: "done",
    delay: "0.38s",
  },
  {
    icon: LoaderCircle,
    iconColor: "var(--a)",
    iconClass: "cb-spin2",
    label: t("callback.exchangingToken"),
    sub: t("callback.communicatingWithServer"),
    state: "active",
    delay: "0.52s",
  },
  {
    icon: CircleDot,
    iconColor: "var(--b1)",
    iconClass: undefined,
    label: t("callback.loadingWorkspace"),
    sub: t("callback.fetchingAccountDetails"),
    state: "pending",
    delay: "0.66s",
  },
]);

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code) {
      throw new Error("No authorization code found in callback URL");
    }

    status.value = "Exchanging token securely";
    const token = await exchangeCode(code);

    if (state === "DESKTOP") {
      window.location.href = `cdp-report-app://callback?token=${token}`;
      closeTab();
      return;
    }

    status.value = "Loading your workspace";
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    const user = await fetchUser();
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(user ?? {}));

    window.history.replaceState({}, "", "/");
    await router.replace("/");
  } catch (error) {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    await router.replace({ path: "/login", query: { error: "callback" } });
  }
});
</script>

<style>
@keyframes orb-a {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  33% {
    transform: translate(70px, -90px) scale(1.08);
  }
  66% {
    transform: translate(-50px, 40px) scale(0.93);
  }
}
@keyframes orb-b {
  0%,
  100% {
    transform: translate(0, 0) scale(1);
  }
  40% {
    transform: translate(-80px, 60px) scale(1.12);
  }
  70% {
    transform: translate(55px, -65px) scale(0.9);
  }
}
@keyframes spin-cw {
  to {
    transform: rotate(360deg);
  }
}
@keyframes spin-ccw {
  to {
    transform: rotate(-360deg);
  }
}
@keyframes pulse-ring {
  0% {
    transform: scale(0.82);
    opacity: 0.75;
  }
  100% {
    transform: scale(2.6);
    opacity: 0;
  }
}
@keyframes fade-up {
  from {
    opacity: 0;
    transform: translateY(22px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
@keyframes shimmer {
  0% {
    background-position: -240% center;
  }
  100% {
    background-position: 240% center;
  }
}
@keyframes dot-blink {
  0%,
  80%,
  100% {
    transform: scale(0.5);
    opacity: 0.3;
  }
  40% {
    transform: scale(1);
    opacity: 1;
  }
}
@keyframes step-in {
  from {
    opacity: 0;
    transform: translateX(-14px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
@keyframes bar-fill {
  from {
    width: 0%;
  }
  to {
    width: 62%;
  }
}
@keyframes ptcl-rise {
  0% {
    transform: translateY(0) scale(1);
    opacity: 0.65;
  }
  100% {
    transform: translateY(-180px) scale(0);
    opacity: 0;
  }
}
@keyframes grid-drift {
  from {
    background-position: 0 0;
  }
  to {
    background-position: 48px 48px;
  }
}
@keyframes scan {
  0% {
    top: -10%;
    opacity: 0;
  }
  6% {
    opacity: 0.55;
  }
  94% {
    opacity: 0.55;
  }
  100% {
    top: 110%;
    opacity: 0;
  }
}
@keyframes conn-blink {
  0%,
  100% {
    opacity: 0.25;
  }
  50% {
    opacity: 0.8;
  }
}
@keyframes hdr-in {
  from {
    opacity: 0;
    transform: translateY(-12px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.cb-orb-a {
  animation: orb-a 11s ease-in-out infinite;
}
.cb-orb-b {
  animation: orb-b 14s ease-in-out infinite;
}
.cb-spin {
  animation: spin-cw 17s linear infinite;
}
.cb-spin2 {
  animation: spin-cw 11s linear infinite;
}
.cb-rspin {
  animation: spin-ccw 12s linear infinite;
}
.cb-pulse {
  animation: pulse-ring 2.6s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}
.cb-fade {
  animation: fade-up 0.6s ease both;
}
.cb-hdr {
  animation: hdr-in 0.5s ease both;
}
.cb-shimmer {
  background: linear-gradient(
    90deg,
    var(--a) 0%,
    #fff 35%,
    var(--a-hi, var(--a)) 55%,
    var(--a) 100%
  );
  background-size: 240% auto;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  animation: shimmer 3s linear infinite;
}
.cb-d1 {
  animation: dot-blink 1.7s ease-in-out 0s infinite;
}
.cb-d2 {
  animation: dot-blink 1.7s ease-in-out 0.22s infinite;
}
.cb-d3 {
  animation: dot-blink 1.7s ease-in-out 0.44s infinite;
}
.cb-step {
  animation: step-in 0.5s ease both;
}
.cb-bar {
  animation: bar-fill 3s cubic-bezier(0.4, 0, 0.2, 1) 0.9s both;
}
.cb-grid {
  animation: grid-drift 6s linear infinite;
}
.cb-ptcl {
  animation: ptcl-rise linear infinite;
}
.cb-scan {
  animation: scan 3.8s ease-in-out 1.2s infinite;
}
.cb-conn {
  animation: conn-blink 1.4s ease-in-out infinite;
}
</style>
