import { StoryKind } from "@storybook/addons";
import minimatch = require("minimatch");

export type Story = {
  kind: string,
  story: string,
};

export type Task<T, S> = (runner: S) => Promise<T>;

export function sleep(time: number = 0) {
  return new Promise(res => {
    setTimeout(() => res(), time);
  });
}

export function flattenStories(stories: StoryKind[]) {
  return stories.reduce(
    (acc, storyKind) => [...acc, ...storyKind.stories.map(story => ({ kind: storyKind.kind, story }))], [] as Story[]
  );
}

export function filterStories(flatStories: Story[], include: string[], exclude: string[]) {
  const conbined = flatStories.map(s => ({ ...s, name: s.kind + "/" + s.story }));
  const included = include.length ? conbined.filter(s => include.some(rule => minimatch(s.name, rule))) : conbined;
  const excluded = exclude.length ? included.filter(s => !exclude.every(rule => minimatch(s.name, rule))) : included;
  return excluded.map(({ kind, story }) => ({ kind, story }));
}

export const execParalell = <T, S>(tasks: Task<T, S>[], runners: S[]) => {
  const copied = tasks.slice();
  const results = <T[]>[];
  const p = runners.length;
  if (!p) throw new Error("No runners");
  return Promise.all(
    new Array(p).fill("").map((_, i) => new Promise((res, rej) => {
      function next(): Promise<number | void> {
        const t = copied.shift();
        return t == null ? Promise.resolve(res()) : t(runners[i])
          .then((r) => results.push(r))
          .then(next)
          .catch(rej);
      }
      return next();
    }))
  ).then(() => results);
};

// From utils of storybook v5
// For more details, https://github.com/storybooks/storybook/blob/v5.0.5/lib/router/src/utils.ts
export const sanitize = (string: string) => {
  return string
    .toLowerCase()
    .replace(/[ ’–—―′¿'`~!@#$%^&*()_|+\-=?;:'",.<>\{\}\[\]\\\/]/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-+/, "")
    .replace(/-+$/, "");
};

const sanitizeSafe = (string: string, part: string) => {
  const sanitized = sanitize(string);
  if (sanitized === "") {
    throw new Error(`Invalid ${part} '${string}', must include alphanumeric characters`);
  }
  return sanitized;
};

export const toId = (kind: string, name: string) =>
  `${sanitizeSafe(kind, "kind")}--${sanitizeSafe(name, "name")}`;
