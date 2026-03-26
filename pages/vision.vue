<script setup lang="ts">
const MAX_LEN = 300;

useHead({ title: "ビジョン" });

const visionFs = useVisionFirestore();

const idealBody = ref("");
const purpose = ref("");
const achievementGoals = ref("");
const saveError = ref<string | null>(null);
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

const purposeCount = computed(() => `${purpose.value.length} / ${MAX_LEN}`);
const goalsCount = computed(
  () => `${achievementGoals.value.length} / ${MAX_LEN}`,
);

function visionPayload() {
  return {
    idealBody: idealBody.value,
    purpose: purpose.value.slice(0, MAX_LEN),
    achievementGoals: achievementGoals.value.slice(0, MAX_LEN),
  };
}

async function persistAll() {
  const r = await visionFs.merge(visionPayload());
  if (!r.ok) {
    saveError.value = r.message;
    return;
  }
  saveError.value = null;
}

function debouncedPersist() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    void visionFs.merge(visionPayload()).then((r) => {
      if (!r.ok) {
        saveError.value = r.message;
        return;
      }
      saveError.value = null;
    });
  }, 400);
}

function onIdealChange() {
  void persistAll();
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

onMounted(async () => {
  const s = await visionFs.load();
  idealBody.value = String(s.idealBody ?? "");
  purpose.value = String(s.purpose ?? "");
  achievementGoals.value = String(s.achievementGoals ?? "");
});
</script>

<template>
  <main class="main vision-main">
    <h1 class="page-title vision-page-title">ビジョン</h1>

    <p v-if="saveError" class="firestore-alert" role="alert">{{ saveError }}</p>

    <form class="profile-form vision-form" autocomplete="off" @submit.prevent>
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
            <textarea
              id="vision-purpose"
              v-model="purpose"
              class="vision-textarea vision-textarea--purpose"
              maxlength="300"
              rows="8"
              aria-labelledby="vision-purpose-heading"
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
            <textarea
              id="vision-achievement-goals"
              v-model="achievementGoals"
              class="vision-textarea"
              maxlength="300"
              rows="5"
              aria-labelledby="vision-goals-heading"
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
    </form>
  </main>
</template>

<style>
@import "~/assets/css/profile.css";
@import "~/assets/css/vision.css";
</style>
