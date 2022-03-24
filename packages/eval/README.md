> **work in progress! everything will change!**

# @nattojs/eval

```js
import { NattoEvaluator } from "@nattojs/eval";

const canvas = { panes: [...] };
const evaluator = new NattoEvaluator(canvas.panes);
const paneValue = await evaluator.getPaneValue(paneId);
```

## API

```ts
type PaneOutput =
  | [type: "value", value: any]
  | [type: "error", error: any]
  | [type: "waiting", id?: string]
  | [type: "running"];

type EvaluatorOptions = {
  globals: Record<string, any>;
};

class NattoEvaluator {
  constructor(panes: Pane[], options?: EvaluatorOptions);
  getPaneOutput(paneId: string, outputIndex?: number = 0): PaneOutput;
  getPaneValue(paneId: string, outputIndex?: number = 0): Promise<any>;
  subscribeToPaneOutput(paneId: string, outputIndex: number, callback: (output: PaneOutput) => void): () => void;
  setPaneValue(paneId: string, outputIndex: number, value: any): void;
  destroy(): void;
}
```

## Notes

- Note the difference between "output" and "value". A pane's output has type `PaneOutput` and may not always contain a value (eg `["waiting"]`).
- `setPaneValue` may be removed. Its behavior is undefined if the pane you set has inputs.
- `getPaneOutput` will always return immediately with the current output, which could be `["waiting"]`.
- `getPaneValue` will resolve immediately if the pane has a value. Otherwise, it will resolve with the next value (when its output is `["value", value]`).
- All panes have one output (`outputIndex = 0`) except state panes, which have two outputs.
- A state pane's second output (`outputIndex = 1`) is the state setter function.
- `evaluator.subscribeToPaneOutput` and `evaluator.setPaneValue` refer to pane's first output.
- `evaluator.subscribeToPaneOutput` returns an unsubscribe function.
- Errors currently cause undefined behavior (todo).
- Template panes, global panes, and import panes with global names are not yet supported.

## Example React usage

```js
import React from "react";

const evaluator = new NattoEvaluator(
  [
    {
      id: paneId,
      type: 0,
      expression: "<div>hi!</div>",
      babelPlugins: ["transform-react-jsx"],
      ...
    },
  ],
  { globals: { React } }
);
const reactElement = await evaluator.getPaneValue(paneId);
```
