/** Must stay in sync with guide-log-frontend `MOOD_PRESETS`. */
export const LOG_MOOD_PRESETS = [
  'Happy',
  'Calm',
  'Anxious',
  'Focused',
  'Tired',
  'Energized',
  'Stressed',
  'Angry',
  'Sad',
  'Numb',
  'Peaceful',
  'Motivated',
  'Overwhelmed',
  'Grateful',
] as const;

export type LogMoodPreset = (typeof LOG_MOOD_PRESETS)[number];

export const MOOD_PRESET_SET = new Set<string>(LOG_MOOD_PRESETS);
