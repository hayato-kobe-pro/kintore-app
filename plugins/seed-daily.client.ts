import { seedDailyIfEmpty } from "~/utils/seedDailyIfEmpty";

export default defineNuxtPlugin(() => {
  seedDailyIfEmpty();
});
