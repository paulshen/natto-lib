import { resolver } from "@rocicorp/resolver";
import { expect, test, vi } from "vitest";
import { NattoEvaluator } from "./api";
import { Pane } from "./types";

const PANE_ID = "M02M5EKLdkyURQXrY1c3i";
const OUTPUT_PANE_ID = "n5EJAkBU4NgEWOGHWv1wT";
const MOCK_PANES: Pane[] = [
  {
    id: PANE_ID,
    rect: [32, 32, 256, 144],
    z: 1,
    inputs: [],
    type: 0,
    name: "x",
    autorun: true,
    expression: "1",
    babelPlugins: [],
  },
  {
    id: OUTPUT_PANE_ID,
    type: 0,
    rect: [368, 32, 256, 144],
    z: 2,
    inputs: [{ id: "u5wc0phd", name: "x", source: [PANE_ID, 0] }],
    expression: "x + 1",
    babelPlugins: [],
    autorun: true,
  },
];

function last<T>(arr: T[]): T {
  return arr[arr.length - 1];
}

test("runs eval panes", async () => {
  const evaluator = new NattoEvaluator(MOCK_PANES);
  const inputFn = vi.fn();
  const outputFn = vi.fn();
  evaluator.subscribeToPaneOutput(PANE_ID, inputFn);
  evaluator.subscribeToPaneOutput(OUTPUT_PANE_ID, outputFn);
  await new Promise(process.nextTick);
  expect(last(inputFn.mock.calls)[0]).toEqual(["value", 1]);
  expect(last(outputFn.mock.calls)[0]).toEqual(["value", 2]);
});

test("getPaneValue resolves with value", async () => {
  const evaluator = new NattoEvaluator(MOCK_PANES);
  expect(evaluator.getPaneValue(OUTPUT_PANE_ID)).resolves.toEqual(2);
});

test("calling state pane setter reruns dependent panes", async () => {
  const evaluator = new NattoEvaluator([
    {
      id: PANE_ID,
      rect: [32, 32, 256, 144],
      z: 1,
      type: 8,
      initialExpression: "1",
    },
    MOCK_PANES[1],
  ]);
  const inputFn = vi.fn();
  const outputFn = vi.fn();
  evaluator.subscribeToPaneOutput(PANE_ID, inputFn);
  evaluator.subscribeToPaneOutput(OUTPUT_PANE_ID, outputFn);
  await new Promise(process.nextTick);
  expect(last(outputFn.mock.calls)[0]).toEqual(["value", 2]);
  const stateSetterOutput = evaluator.getPaneOutput(PANE_ID, 1);
  expect(stateSetterOutput[0]).toEqual("value");
  const stateSetter = stateSetterOutput[1];
  stateSetter(2);
  await new Promise(process.nextTick);
  expect(last(inputFn.mock.calls)[0]).toEqual(["value", 2]);
  expect(last(outputFn.mock.calls)[0]).toEqual(["value", 3]);
  expect(evaluator.getPaneValue(OUTPUT_PANE_ID)).resolves.toEqual(3);
});

test("globals are referenced", async () => {
  const globals = { React: {} };
  const evaluator = new NattoEvaluator(
    [
      {
        id: PANE_ID,
        rect: [32, 32, 256, 144],
        z: 1,
        inputs: [],
        type: 0,
        autorun: true,
        expression: "React",
      },
    ],
    { globals }
  );
  const fn = vi.fn();
  evaluator.subscribeToPaneOutput(PANE_ID, fn);
  await new Promise(process.nextTick);
  const paneOutput = last(fn.mock.calls)[0];
  expect(paneOutput[0]).toEqual("value");
  expect(paneOutput[1]).toBe(globals.React);
});

test("transform-react-jsx babel plugin calls React global", async () => {
  const createElementFn = vi.fn();
  const globals = { React: { createElement: createElementFn } };
  const evaluator = new NattoEvaluator(
    [
      {
        id: PANE_ID,
        rect: [32, 32, 256, 144],
        z: 1,
        inputs: [],
        type: 0,
        autorun: true,
        expression: "<div>hi</div>",
        babelPlugins: ["transform-react-jsx"],
      },
    ],
    { globals }
  );
  const { promise, resolve } = resolver();
  const fn = vi.fn((output) => {
    if (output[0] === "value") {
      expect(createElementFn).toHaveBeenCalledWith("div", null, "hi");
      resolve();
    }
  });
  evaluator.subscribeToPaneOutput(PANE_ID, fn);
  await promise;
});
