import { expect, test, vi } from "vitest";
import { NattoEvaluator } from "./api";
import { Pane } from "./types";

const InputPaneId = "M02M5EKLdkyURQXrY1c3i";
const OutputPaneId = "n5EJAkBU4NgEWOGHWv1wT";
const MOCK_PANES: Pane[] = [
  {
    id: InputPaneId,
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
    id: OutputPaneId,
    type: 0,
    rect: [368, 32, 256, 144],
    z: 2,
    inputs: [{ id: "u5wc0phd", name: "x", source: [InputPaneId, 0] }],
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
  evaluator.subscribeToPaneOutput(InputPaneId, 0, inputFn);
  evaluator.subscribeToPaneOutput(OutputPaneId, 0, outputFn);
  await new Promise(process.nextTick);
  expect(last(inputFn.mock.calls)[0]).toEqual(["value", 1]);
  expect(last(outputFn.mock.calls)[0]).toEqual(["value", 2]);
});

test("setPaneValue runs dependent panes", async () => {
  const evaluator = new NattoEvaluator(MOCK_PANES);
  const inputFn = vi.fn();
  const outputFn = vi.fn();
  evaluator.subscribeToPaneOutput(InputPaneId, 0, inputFn);
  evaluator.subscribeToPaneOutput(OutputPaneId, 0, outputFn);
  await new Promise(process.nextTick);
  expect(inputFn.mock.calls[0][0]).toEqual(["value", 1]);
  expect(outputFn.mock.calls[0][0]).toEqual(["value", 2]);
  evaluator.setPaneValue(InputPaneId, 0, 2);
  await new Promise(process.nextTick);
  expect(inputFn.mock.calls[1][0]).toEqual(["value", 2]);
  expect(outputFn.mock.calls[1][0]).toEqual(["value", 3]);
});

test("calling state pane setter reruns dependent panes", async () => {
  const evaluator = new NattoEvaluator([
    {
      id: InputPaneId,
      rect: [32, 32, 256, 144],
      z: 1,
      type: 8,
      initialExpression: "1",
    },
    MOCK_PANES[1],
  ]);
  const inputFn = vi.fn();
  const outputFn = vi.fn();
  evaluator.subscribeToPaneOutput(InputPaneId, 0, inputFn);
  evaluator.subscribeToPaneOutput(OutputPaneId, 0, outputFn);
  await new Promise(process.nextTick);
  expect(last(outputFn.mock.calls)[0]).toEqual(["value", 2]);
  const stateSetterOutput = evaluator.getPaneOutput(InputPaneId, 1);
  expect(stateSetterOutput[0]).toEqual("value");
  const stateSetter = stateSetterOutput[1];
  stateSetter(2);
  await new Promise(process.nextTick);
  expect(last(inputFn.mock.calls)[0]).toEqual(["value", 2]);
  expect(last(outputFn.mock.calls)[0]).toEqual(["value", 3]);
});

test("globals are referenced", async () => {
  const globals = { React: {} };
  const evaluator = new NattoEvaluator(
    [
      {
        id: InputPaneId,
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
  evaluator.subscribeToPaneOutput(InputPaneId, 0, fn);
  await new Promise(process.nextTick);
  const paneOutput = last(fn.mock.calls)[0];
  expect(paneOutput[0]).toEqual("value");
  expect(paneOutput[1]).toBe(globals.React);
});
