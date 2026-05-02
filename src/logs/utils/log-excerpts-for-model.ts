import { Log } from 'src/logs/entities/log.entity';

/** Max characters per textual field when building the model input. */
export const LOG_EXCERPT_TRUNCATION = 500;

export function clipLogExcerpt(value: string | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const s = String(value).trim();
  if (s.length <= LOG_EXCERPT_TRUNCATION) {
    return s;
  }
  return `${s.slice(0, LOG_EXCERPT_TRUNCATION)}…`;
}

const DEFAULT_INTRO = 'Log excerpts (most recent slice first):\n';

/**
 * Plain-text serialization of logs for OpenAI (and similar) prompts.
 * Matches the historical LogInsightsService format when using the default intro.
 */
export function serializeLogsForModel(
  logs: Log[],
  introLine: string = DEFAULT_INTRO,
): string {
  const lines: string[] = [introLine];

  let index = 0;
  for (const log of logs) {
    index += 1;
    lines.push(`--- Log ${index} ---`);

    lines.push(`Title: ${clipLogExcerpt(log.name) || '(no title)'}`);

    if (log.completedDate) {
      lines.push(
        `Completed: ${log.completedDate instanceof Date ? log.completedDate.toISOString() : String(log.completedDate)}`,
      );
    }
    if (log.mood) {
      lines.push(`Mood: ${clipLogExcerpt(log.mood)}`);
    }
    if (log.category) {
      lines.push(`Category: ${clipLogExcerpt(log.category)}`);
    }
    const desc = clipLogExcerpt(log.description);
    if (desc) {
      lines.push(`Description: ${desc}`);
    }
    const sur = clipLogExcerpt(log.surroundings);
    if (sur) {
      lines.push(`Surroundings: ${sur}`);
    }

    const habitName = log.habit?.name;
    if (habitName) {
      lines.push(`Habit: ${clipLogExcerpt(habitName)}`);
    }

    const pgTitle = log.personalGoal?.title;
    if (pgTitle) {
      lines.push(`Personal goal: ${clipLogExcerpt(pgTitle)}`);
    }

    const notes = log.notes ?? [];
    if (notes.length > 0) {
      lines.push('Notes:');
      for (const note of notes) {
        lines.push(`- ${clipLogExcerpt(note?.content)}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
