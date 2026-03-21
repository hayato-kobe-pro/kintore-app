<script setup lang="ts">
const STORAGE_KEY = "kintore-profile-v1";

type Profile = {
  height: number | "";
  weight: number | "";
  bodyFat: number | "";
  trainingExperience: string;
  bulkOrCut: string;
  goalCalories: number | "";
  goalProtein: number | "";
  goalFat: number | "";
  goalCarbs: number | "";
  goalFiber: number | "";
  goalWeight: number | "";
  goalSleep: number | "";
};

const DEFAULT_PROFILE: Profile = {
  height: "",
  weight: "",
  bodyFat: "",
  trainingExperience: "",
  bulkOrCut: "",
  goalCalories: "",
  goalProtein: "",
  goalFat: "",
  goalCarbs: "",
  goalFiber: "",
  goalWeight: "",
  goalSleep: "",
};

function loadProfile(): Profile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PROFILE };
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...parsed } as Profile;
  } catch {
    return { ...DEFAULT_PROFILE };
  }
}

function saveProfile(data: Profile) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function activityFactor(exp: string) {
  switch (exp) {
    case "半年未満":
      return 1.36;
    case "半年〜1年":
      return 1.42;
    case "1〜3年":
      return 1.48;
    case "3年以上":
      return 1.54;
    default:
      return 1.45;
  }
}

function computeGoalsFromProfile(p: Profile) {
  const w = Number(p.weight);
  if (!Number.isFinite(w) || w <= 0) {
    return {
      goalCalories: "" as const,
      goalProtein: "" as const,
      goalFat: "" as const,
      goalCarbs: "" as const,
      goalFiber: "" as const,
    };
  }

  const bf = Number(p.bodyFat);
  const h = Number(p.height);
  const lean =
    Number.isFinite(bf) && bf >= 5 && bf <= 55 ? w * (1 - bf / 100) : w;

  let bmr: number;
  if (Number.isFinite(bf) && bf >= 5 && bf <= 55) {
    bmr = 370 + 21.6 * lean;
  } else if (Number.isFinite(h) && h > 100 && h < 230) {
    bmr = 10 * w + 6.25 * h - 5 * 30 - 161;
  } else {
    bmr = 22 * w;
  }

  const f = activityFactor(p.trainingExperience);
  let kcal = Math.round(bmr * f);
  if (p.bulkOrCut === "増量") kcal += 280;
  else if (p.bulkOrCut === "減量") kcal -= 420;
  kcal = Math.max(1300, kcal);

  const proteinG = Math.round(lean * 2);
  let fatG = Math.round((kcal * 0.27) / 9);
  fatG = Math.max(35, fatG);
  let carbKcal = kcal - proteinG * 4 - fatG * 9;
  if (carbKcal < 200) {
    fatG = Math.max(30, Math.round((kcal - proteinG * 4 - 200) / 9));
    carbKcal = kcal - proteinG * 4 - fatG * 9;
  }
  const carbG = Math.max(0, Math.round(carbKcal / 4));
  const fiberG = Math.min(30, Math.max(18, Math.round(kcal / 92)));

  return {
    goalCalories: kcal,
    goalProtein: proteinG,
    goalFat: fatG,
    goalCarbs: carbG,
    goalFiber: fiberG,
  };
}

useHead({ title: "プロフィール" });

const profile = reactive<Profile>(loadProfile());
const saveHint = ref(false);
let saveHintTimer: ReturnType<typeof setTimeout> | null = null;

function showSaved() {
  saveHint.value = true;
  if (saveHintTimer) clearTimeout(saveHintTimer);
  saveHintTimer = setTimeout(() => {
    saveHint.value = false;
  }, 1200);
}

function formatGoalOut(v: number | "") {
  if (v === "" || v == null) return "—";
  const n = Number(v);
  return Number.isFinite(n) ? String(Math.round(n)) : "—";
}

const goalCaloriesOut = ref("—");
const goalProteinOut = ref("—");
const goalFatOut = ref("—");
const goalCarbsOut = ref("—");
const goalFiberOut = ref("—");

function renderGoalOutputs(g: ReturnType<typeof computeGoalsFromProfile>) {
  goalCaloriesOut.value = formatGoalOut(g.goalCalories);
  goalProteinOut.value = formatGoalOut(g.goalProtein);
  goalFatOut.value = formatGoalOut(g.goalFat);
  goalCarbsOut.value = formatGoalOut(g.goalCarbs);
  goalFiberOut.value = formatGoalOut(g.goalFiber);
}

function applyComputedGoals(showHint: boolean) {
  const g = computeGoalsFromProfile(profile);
  Object.assign(profile, {
    goalCalories: g.goalCalories,
    goalProtein: g.goalProtein,
    goalFat: g.goalFat,
    goalCarbs: g.goalCarbs,
    goalFiber: g.goalFiber,
  });
  saveProfile({ ...profile });
  renderGoalOutputs(g);
  if (showHint) showSaved();
}

function patchProfile(patch: Partial<Profile>) {
  Object.assign(profile, patch);
  applyComputedGoals(true);
}

function onNumberInput(key: keyof Profile, raw: string) {
  if (raw === "") {
    patchProfile({ [key]: "" } as Partial<Profile>);
    return;
  }
  const num = Number(raw);
  patchProfile({ [key]: Number.isFinite(num) ? num : "" } as Partial<Profile>);
}

function onSelectChange(key: keyof Profile, v: string) {
  patchProfile({ [key]: v } as Partial<Profile>);
}

function onBulkCutChange(v: string) {
  patchProfile({ bulkOrCut: v });
}

function inputVal(e: Event) {
  return (e.target as HTMLInputElement).value;
}

function selectVal(e: Event) {
  return (e.target as HTMLSelectElement).value;
}

onMounted(() => {
  applyComputedGoals(false);
});
</script>

<template>
  <main class="main">
    <h1 class="page-title">プロフィール</h1>

    <form class="profile-form" autocomplete="off" @submit.prevent>
      <section class="card profile-card" aria-labelledby="profile-basic-heading">
        <h2 id="profile-basic-heading" class="profile-section-title">基本情報</h2>
        <div class="fields">
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-condition)" />
              身長<span class="unit">（cm）</span>
            </span>
            <input
              type="number"
              inputmode="decimal"
              step="0.1"
              min="0"
              :value="profile.height === '' ? '' : String(profile.height)"
              placeholder="—"
              @change="onNumberInput('height', inputVal($event))"
            />
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-weight)" />
              体重<span class="unit">（kg）</span>
            </span>
            <input
              type="number"
              inputmode="decimal"
              step="0.1"
              min="0"
              :value="profile.weight === '' ? '' : String(profile.weight)"
              placeholder="—"
              @change="onNumberInput('weight', inputVal($event))"
            />
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-fat)" />
              体脂肪率<span class="unit">（%）</span>
            </span>
            <input
              type="number"
              inputmode="decimal"
              step="0.1"
              min="0"
              :value="profile.bodyFat === '' ? '' : String(profile.bodyFat)"
              placeholder="—"
              @change="onNumberInput('bodyFat', inputVal($event))"
            />
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--accent)" />
              トレーニング経験
            </span>
            <select
              :value="profile.trainingExperience"
              aria-label="トレーニング経験"
              @change="onSelectChange('trainingExperience', selectVal($event))"
            >
              <option value="">選択してください</option>
              <option value="半年未満">半年未満</option>
              <option value="半年〜1年">半年〜1年</option>
              <option value="1〜3年">1〜3年</option>
              <option value="3年以上">3年以上</option>
            </select>
          </div>
          <div class="field" data-profile="bulk-cut">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-protein)" />
              増量 or 減量
            </span>
            <div class="segmented condition-seg" role="group" aria-label="増量 or 減量">
              <input
                id="bulk-none"
                type="radio"
                name="bulkOrCut"
                value=""
                :checked="profile.bulkOrCut === ''"
                @change="onBulkCutChange('')"
              />
              <label for="bulk-none">—</label>
              <input
                id="bulk-up"
                type="radio"
                name="bulkOrCut"
                value="増量"
                :checked="profile.bulkOrCut === '増量'"
                @change="onBulkCutChange('増量')"
              />
              <label for="bulk-up">増量</label>
              <input
                id="bulk-down"
                type="radio"
                name="bulkOrCut"
                value="減量"
                :checked="profile.bulkOrCut === '減量'"
                @change="onBulkCutChange('減量')"
              />
              <label for="bulk-down">減量</label>
              <input
                id="bulk-maintain"
                type="radio"
                name="bulkOrCut"
                value="維持"
                :checked="profile.bulkOrCut === '維持'"
                @change="onBulkCutChange('維持')"
              />
              <label for="bulk-maintain">維持</label>
            </div>
          </div>
        </div>
      </section>

      <section class="card profile-card" aria-labelledby="profile-goals-heading">
        <h2 id="profile-goals-heading" class="profile-section-title">目標</h2>
        <p class="profile-section-note">
          目標体重・目標睡眠時間は手入力です。カロリー・PFCは基本情報から自動計算されます（体重が未入力のときは — ）。
        </p>
        <div class="fields">
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-weight)" />
              目標体重<span class="unit">（kg）</span>
            </span>
            <input
              type="number"
              inputmode="decimal"
              step="0.1"
              min="0"
              :value="profile.goalWeight === '' ? '' : String(profile.goalWeight)"
              placeholder="—"
              @change="onNumberInput('goalWeight', inputVal($event))"
            />
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-sleep)" />
              目標睡眠時間<span class="unit">（h）</span>
            </span>
            <input
              type="number"
              inputmode="decimal"
              step="0.1"
              min="0"
              max="24"
              :value="profile.goalSleep === '' ? '' : String(profile.goalSleep)"
              placeholder="—"
              @change="onNumberInput('goalSleep', inputVal($event))"
            />
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-cal)" />
              目標カロリー<span class="unit">（kcal）</span>
            </span>
            <div id="profile-goal-calories" class="profile-computed" aria-live="polite">
              {{ goalCaloriesOut }}
            </div>
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-protein)" />
              タンパク質<span class="unit">（g）</span>
            </span>
            <div id="profile-goal-protein" class="profile-computed" aria-live="polite">
              {{ goalProteinOut }}
            </div>
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-fat)" />
              脂質<span class="unit">（g）</span>
            </span>
            <div id="profile-goal-fat" class="profile-computed" aria-live="polite">
              {{ goalFatOut }}
            </div>
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-carb)" />
              炭水化物<span class="unit">（g）</span>
            </span>
            <div id="profile-goal-carbs" class="profile-computed" aria-live="polite">
              {{ goalCarbsOut }}
            </div>
          </div>
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-fiber)" />
              食物繊維<span class="unit">（g）</span>
            </span>
            <div id="profile-goal-fiber" class="profile-computed" aria-live="polite">
              {{ goalFiberOut }}
            </div>
          </div>
        </div>
      </section>

      <p id="save-hint" class="save-hint" :hidden="!saveHint">保存しました</p>
    </form>
  </main>
</template>

<style src="~/assets/css/profile.css"></style>
