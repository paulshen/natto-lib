import { makeObservable, observable } from "mobx";

export type Atom<T> = { value: T };
export function atom<T>(initialValue: T): Atom<T> {
  return makeObservable(
    {
      value: initialValue,
    },
    {
      value: observable.ref,
    }
  );
}
