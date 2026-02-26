type GenericFn<TArgs extends unknown[]> = (...args: TArgs) => void;

export type DebouncedFunction<TArgs extends unknown[]> = GenericFn<TArgs> & {
  cancel: () => void;
  flush: () => void;
};

export const debounce = <TArgs extends unknown[]>(
  fn: GenericFn<TArgs>,
  waitMs: number
): DebouncedFunction<TArgs> => {
  let timer: ReturnType<typeof setTimeout> | undefined;
  let latestArgs: TArgs | undefined;

  const invoke = (): void => {
    if (!latestArgs) {
      return;
    }

    const argsToRun = latestArgs;
    latestArgs = undefined;
    timer = undefined;
    fn(...argsToRun);
  };

  const debounced = (...args: TArgs): void => {
    latestArgs = args;

    if (timer) {
      clearTimeout(timer);
    }

    timer = setTimeout(invoke, waitMs);
  };

  debounced.cancel = (): void => {
    if (timer) {
      clearTimeout(timer);
      timer = undefined;
    }

    latestArgs = undefined;
  };

  debounced.flush = (): void => {
    if (!timer) {
      return;
    }

    clearTimeout(timer);
    invoke();
  };

  return debounced;
};
