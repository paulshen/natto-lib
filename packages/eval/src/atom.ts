import * as mobx from "mobx";

export type Atom<T> = { value: T };
export function atom<T>(initialValue: T): Atom<T> {
  return mobx.makeObservable(
    {
      value: initialValue,
    },
    {
      value: mobx.observable.ref,
    }
  );
}
