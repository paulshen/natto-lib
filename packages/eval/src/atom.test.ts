import { reaction, runInAction } from "mobx";
import { expect, test, vi } from "vitest";
import { atom } from "./atom";

test("atom has initial value without proxy", () => {
  const initialValue = {};
  const a = atom(initialValue);
  expect(a.value).toBe(initialValue);
});

test("atom reacts when value is set", () => {
  const value = {};
  const a = atom(value);
  const fn = vi.fn();
  reaction(() => a.value, fn);
  runInAction(() => {
    a.value = {};
  });
  expect(fn).toHaveBeenCalled();
});

test("atom doesn't react when value is mutated", () => {
  const value: Record<string, any> = {};
  const a = atom(value);
  const fn = vi.fn();
  reaction(() => a.value, fn);
  runInAction(() => {
    value.x = 1;
  });
  expect(fn).not.toHaveBeenCalled();
});
