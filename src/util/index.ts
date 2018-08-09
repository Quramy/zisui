export type Task<T> = (idx: number) => Promise<T>;

export const execParalell = <T>(tasks: Task<T>[], p: number = 1) => {
  const copied = tasks.slice();
  const results = <T[]>[];
  return Promise.all(
    new Array(p).fill("").map((_, i) => new Promise((res, rej) => {
      function next(): Promise<number | void> {
        const t = copied.shift();
        return t == null ? Promise.resolve(res()) : t(i)
          .then((r) => results.push(r))
          .then(next)
          .catch(rej);
      }
      return next();
    }))
  ).then(() => results);
};
