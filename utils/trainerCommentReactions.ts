/** トレーナーコメントに付けられるリアクション（この5種のみ） */
export const TRAINER_COMMENT_REACTION_EMOJIS = [
  "❤️",
  "💪",
  "😄",
  "😂",
  "😢",
] as const;

export type TrainerCommentReactionEmoji =
  (typeof TRAINER_COMMENT_REACTION_EMOJIS)[number];

const ALLOWED = new Set<string>(TRAINER_COMMENT_REACTION_EMOJIS);

export function isAllowedTrainerCommentReactionEmoji(
  s: string,
): s is TrainerCommentReactionEmoji {
  return ALLOWED.has(s);
}
