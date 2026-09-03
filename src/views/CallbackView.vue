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

    <svg
      class="absolute top-0 right-0 pointer-events-none"
      width="340"
      height="340"
      viewBox="0 0 340 340"
      fill="none"
      aria-hidden
      style="opacity: 0.07"
    >
      <circle
        v-for="(r, index) in [280, 200, 120]"
        :key="index"
        cx="340"
        cy="0"
        :r="r"
        stroke="var(--a)"
        stroke-width="1"
      />
    </svg>

    <svg
      class="absolute bottom-0 left-0 pointer-events-none"
      width="280"
      height="280"
      viewBox="0 0 280 280"
      fill="none"
      aria-hidden
      style="opacity: 0.07"
    >
      <circle
        v-for="(r, index) in [240, 160]"
        :key="index"
        cx="0"
        cy="280"
        :r="r"
        stroke="var(--a)"
        stroke-width="1"
      />
    </svg>

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
          <ShieldSvg :size="15" />
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
        Secure connection
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
          <svg viewBox="0 0 168 168" class="w-full h-full">
            <circle
              cx="84"
              cy="84"
              r="78"
              fill="none"
              stroke="var(--a)"
              stroke-width="1.4"
              stroke-dasharray="14 7"
              stroke-linecap="round"
              opacity=".45"
            />
            <circle
              v-for="deg in [0, 120, 240]"
              :key="deg"
              :cx="84 + 78 * Math.cos(((deg - 90) * Math.PI) / 180)"
              :cy="84 + 78 * Math.sin(((deg - 90) * Math.PI) / 180)"
              r="4"
              fill="var(--a)"
              opacity=".85"
            />
          </svg>
        </div>

        <div class="cb-rspin absolute" style="inset: 18px">
          <svg viewBox="0 0 132 132" class="w-full h-full">
            <circle
              cx="66"
              cy="66"
              r="60"
              fill="none"
              stroke="var(--a)"
              stroke-width="1"
              stroke-dasharray="5 13"
              stroke-linecap="round"
              opacity=".3"
            />
            <circle
              v-for="deg in [60, 300]"
              :key="deg"
              :cx="66 + 60 * Math.cos(((deg - 90) * Math.PI) / 180)"
              :cy="66 + 60 * Math.sin(((deg - 90) * Math.PI) / 180)"
              r="2.5"
              fill="var(--a)"
              opacity=".5"
            />
          </svg>
        </div>

        <div class="cb-spin2 absolute" style="inset: 36px">
          <svg viewBox="0 0 96 96" class="w-full h-full">
            <circle
              cx="48"
              cy="48"
              r="44"
              fill="none"
              stroke="var(--a)"
              stroke-width="0.8"
              stroke-dasharray="3 18"
              stroke-linecap="round"
              opacity=".2"
            />
          </svg>
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
          <ShieldSvg :size="34" />
        </div>
      </div>

      <div class="cb-fade text-center" style="animation-delay: 0.22s">
        <h1
          class="cb-shimmer text-[26px] font-bold tracking-tight leading-tight"
        >
          Securing your session
        </h1>
        <p
          class="mt-1.5 text-[13.5px] text-i2 max-w-xs mx-auto leading-relaxed"
        >
          Verifying your credentials and establishing a protected workspace
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
            <component :is="step.icon" />
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
            <CheckTiny /> Done
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
            Active
          </span>
        </div>
      </div>

      <div
        class="cb-fade w-full"
        style="max-width: 480px; animation-delay: 0.5s"
      >
        <div class="flex justify-between items-center mb-2">
          <span class="text-[11.5px] text-i3 font-medium"
            >Authentication progress</span
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
        <LockTiny />
        <span>PKCE secured</span>
      </div>
      <div class="w-px h-3 bg-b1" />
      <div class="flex items-center gap-1.5 text-[11px] text-i3">
        <CheckTiny />
        <span>End-to-end encrypted</span>
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
        <span>Secure channel active</span>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { computed, h, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { AUTH_CONFIG } from "../config/auth.config";
import { createAuthService } from "../services/authService";
import { closeTab } from "../utils/closeTab";

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
    icon: StepCheck,
    label: "Authorization code received",
    sub: "PKCE code verified",
    state: "done",
    delay: "0.38s",
  },
  {
    icon: StepSpin,
    label: "Exchanging token securely",
    sub: "Communicating with server",
    state: "active",
    delay: "0.52s",
  },
  {
    icon: StepPending,
    label: "Loading your workspace",
    sub: "Fetching account details",
    state: "pending",
    delay: "0.66s",
  },
]);

function ShieldSvg({ size = 36 }: { size?: number }) {
  const s = size / 34;
  return h(
    "svg",
    {
      width: size,
      height: size * (34 / 30),
      viewBox: "0 0 30 34",
      fill: "none",
      "aria-hidden": true,
    },
    [
      h("path", {
        d: "M15 1.5L2.5 7v10.5C2.5 24.956 8.19 31.2 15 32.5c6.81-1.3 12.5-7.544 12.5-15V7L15 1.5Z",
        fill: "var(--a-18,rgba(99,102,241,.15))",
        stroke: "var(--a)",
        strokeWidth: 1.5 / s,
        strokeLinejoin: "round",
      }),
      h("rect", {
        x: "10.5",
        y: "16",
        width: "9",
        height: "8",
        rx: "2",
        fill: "var(--a)",
        opacity: ".9",
      }),
      h("path", {
        d: "M12.5 16v-3a2.5 2.5 0 015 0v3",
        stroke: "var(--a)",
        strokeWidth: 1.5 / s,
        strokeLinecap: "round",
      }),
      h("circle", {
        cx: "15",
        cy: "20",
        r: "1.3",
        fill: "white",
        opacity: ".9",
      }),
    ],
  );
}

function LockTiny() {
  return h(
    "svg",
    {
      width: "11",
      height: "11",
      viewBox: "0 0 11 11",
      fill: "none",
      "aria-hidden": true,
    },
    [
      h("rect", {
        x: "2",
        y: "5",
        width: "7",
        height: "5.5",
        rx: "1.2",
        stroke: "currentColor",
        strokeWidth: "1.1",
      }),
      h("path", {
        d: "M3.5 5V3.5a2 2 0 014 0V5",
        stroke: "currentColor",
        strokeWidth: "1.1",
        strokeLinecap: "round",
      }),
    ],
  );
}

function CheckTiny() {
  return h(
    "svg",
    {
      width: "11",
      height: "11",
      viewBox: "0 0 11 11",
      fill: "none",
      "aria-hidden": true,
    },
    [
      h("path", {
        d: "M2 5.5l2.5 2.5 4.5-4.5",
        stroke: "currentColor",
        strokeWidth: "1.4",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
    ],
  );
}

function StepCheck() {
  return h(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 16 16",
      fill: "none",
      "aria-hidden": true,
    },
    [
      h("circle", {
        cx: "8",
        cy: "8",
        r: "8",
        fill: "var(--green,#22c55e)",
        opacity: ".16",
      }),
      h("circle", {
        cx: "8",
        cy: "8",
        r: "7",
        stroke: "var(--green,#22c55e)",
        strokeWidth: "1.3",
      }),
      h("path", {
        d: "M5 8l2.2 2.2L11 5.5",
        stroke: "var(--green,#22c55e)",
        strokeWidth: "1.5",
        strokeLinecap: "round",
        strokeLinejoin: "round",
      }),
    ],
  );
}

function StepSpin() {
  return h(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 16 16",
      fill: "none",
      "aria-hidden": true,
      class: "cb-spin2",
      style: { display: "inline-block" },
    },
    [
      h("circle", {
        cx: "8",
        cy: "8",
        r: "7",
        stroke: "var(--b1)",
        strokeWidth: "1.4",
      }),
      h("path", {
        d: "M8 1a7 7 0 017 7",
        stroke: "var(--a)",
        strokeWidth: "1.8",
        strokeLinecap: "round",
      }),
    ],
  );
}

function StepPending() {
  return h(
    "svg",
    {
      width: "16",
      height: "16",
      viewBox: "0 0 16 16",
      fill: "none",
      "aria-hidden": true,
    },
    [
      h("circle", {
        cx: "8",
        cy: "8",
        r: "7",
        stroke: "var(--b1)",
        strokeWidth: "1.4",
      }),
      h("circle", { cx: "8", cy: "8", r: "2.5", fill: "var(--b1)" }),
    ],
  );
}

onMounted(async () => {
  try {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");
    const state = params.get("state");

    if (!code) {
      throw new Error("No authorization code found in callback URL");
    }

    const authService = createAuthService({
      clientId: AUTH_CONFIG.clientId,
      tenant: AUTH_CONFIG.tenant,
      authUrl: AUTH_CONFIG.authUrl,
      tokenUrl: AUTH_CONFIG.tokenUrl,
      userUrl: AUTH_CONFIG.userUrl,
      redirectUri: AUTH_CONFIG.redirectUri,
      logoutUri: AUTH_CONFIG.logoutUri,
      state: AUTH_CONFIG.state,
      codeChallenge: AUTH_CONFIG.codeChallenge,
    });

    status.value = "Exchanging token securely";
    const token = await authService.exchangeCode(code);

    if (state === "DESKTOP") {
      window.location.href = `cdp-report-app://callback?token=${token}`;
      closeTab();
      return;
    }

    status.value = "Loading your workspace";
    const user = await authService.fetchUser(token);

    localStorage.setItem("jrxml_auth_user", JSON.stringify(user ?? {}));
    localStorage.setItem("jrxml_auth_token", token);

    window.history.replaceState({}, "", "/");
    await router.replace("/");
  } catch (error) {
    localStorage.removeItem("jrxml_auth_token");
    localStorage.removeItem("jrxml_auth_user");
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
