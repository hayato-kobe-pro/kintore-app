<script setup lang="ts">
const STORAGE_KEY = "kintore-vision-v1";
const MAX_LEN = 300;

const DEFAULT_STATE = {
  idealBody: "",
  purpose: "",
  achievementGoals: "",
};

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Record<string, string>;
    if (!parsed || typeof parsed !== "object") return { ...DEFAULT_STATE };
    return { ...DEFAULT_STATE, ...parsed };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

function saveState(data: typeof DEFAULT_STATE) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

useHead({ title: "ビジョン" });

const idealBody = ref("");
const purpose = ref("");
const achievementGoals = ref("");
const saveHint = ref(false);
let saveHintTimer: ReturnType<typeof setTimeout> | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

function showSaved() {
  saveHint.value = true;
  if (saveHintTimer) clearTimeout(saveHintTimer);
  saveHintTimer = setTimeout(() => {
    saveHint.value = false;
  }, 1200);
}

const purposeCount = computed(() => `${purpose.value.length} / ${MAX_LEN}`);
const goalsCount = computed(
  () => `${achievementGoals.value.length} / ${MAX_LEN}`,
);

function persistAll() {
  saveState({
    idealBody: idealBody.value,
    purpose: purpose.value.slice(0, MAX_LEN),
    achievementGoals: achievementGoals.value.slice(0, MAX_LEN),
  });
  showSaved();
}

function debouncedPersist() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    saveState({
      idealBody: idealBody.value,
      purpose: purpose.value.slice(0, MAX_LEN),
      achievementGoals: achievementGoals.value.slice(0, MAX_LEN),
    });
    showSaved();
  }, 400);
}

function onIdealChange() {
  persistAll();
}

function onPurposeInput() {
  if (purpose.value.length > MAX_LEN) {
    purpose.value = purpose.value.slice(0, MAX_LEN);
  }
  debouncedPersist();
}

function onGoalsInput() {
  if (achievementGoals.value.length > MAX_LEN) {
    achievementGoals.value = achievementGoals.value.slice(0, MAX_LEN);
  }
  debouncedPersist();
}

onMounted(() => {
  const s = loadState();
  idealBody.value = s.idealBody || "";
  purpose.value = s.purpose || "";
  achievementGoals.value = s.achievementGoals || "";
});
</script>

<template>
  <main class="main">
    <h1 class="page-title">ビジョン</h1>

    <form class="profile-form" autocomplete="off" @submit.prevent>
      <section class="card vision-card" aria-labelledby="vision-ideal-heading">
        <h2 id="vision-ideal-heading" class="profile-section-title">理想の体</h2>
        <div class="fields">
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--accent)" />
              イメージを選ぶ
            </span>
            <select
              id="vision-ideal-body"
              v-model="idealBody"
              aria-label="理想の体"
              @change="onIdealChange"
            >
              <option value="">選択してください</option>
              <option value="引き締まった均整のとれた体型">
                引き締まった均整のとれた体型
              </option>
              <option value="筋肉質・マッスルボディ">筋肉質・マッスルボディ</option>
              <option value="スリム・細身">スリム・細身</option>
              <option value="健康的な標準体型">健康的な標準体型</option>
              <option value="大きく見えるワイドな体格">
                大きく見えるワイドな体格
              </option>
              <option value="はっきりしたライン（腹筋など）">
                はっきりしたライン（腹筋など）
              </option>
              <option value="まだ決めていない">まだ決めていない</option>
            </select>
          </div>
        </div>
      </section>

      <section class="card vision-card" aria-labelledby="vision-purpose-heading">
        <h2 id="vision-purpose-heading" class="profile-section-title">
          ボディメイクの目的
        </h2>
        <div class="fields">
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-protein)" />
              自由入力（300文字まで）
            </span>
            <textarea
              id="vision-purpose"
              v-model="purpose"
              class="vision-textarea"
              maxlength="300"
              rows="5"
              placeholder="なぜボディメイクをしたいか、モチベーションや背景など"
              @input="onPurposeInput"
            />
            <div class="vision-char-row">
              <span
                id="vision-purpose-count"
                class="vision-char-count"
                aria-live="polite"
              >{{ purposeCount }}</span>
            </div>
          </div>
        </div>
      </section>

      <section class="card vision-card" aria-labelledby="vision-goals-heading">
        <h2 id="vision-goals-heading" class="profile-section-title">
          達成したい目標
        </h2>
        <div class="fields">
          <div class="field">
            <span class="field-label">
              <span class="field-label-dot" style="background: var(--c-cal)" />
              自由入力（300文字まで）
            </span>
            <textarea
              id="vision-achievement-goals"
              v-model="achievementGoals"
              class="vision-textarea"
              maxlength="300"
              rows="5"
              placeholder="数値・期限・イベントなど、達成したいことを具体的に"
              @input="onGoalsInput"
            />
            <div class="vision-char-row">
              <span
                id="vision-goals-count"
                class="vision-char-count"
                aria-live="polite"
              >{{ goalsCount }}</span>
            </div>
          </div>
        </div>
      </section>

      <p id="save-hint" class="save-hint" :hidden="!saveHint">保存しました</p>
    </form>
  </main>
</template>

<style src="~/assets/css/profile.css"></style>
<style src="~/assets/css/vision.css"></style>
