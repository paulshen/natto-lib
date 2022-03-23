> **work in progress! everything will change!**

# @nattojs/eval

```js
import { NattoEvaluator } from "@nattojs/eval";

const canvas = { panes: [...] };
const evaluator = new NattoEvaluator(canvas.panes);
evaluator.getPaneOutput(paneId);
```

## API

```ts
type PaneOutput =
  | ["value", any]
  | ["error", any]
  | [type: "waiting", id?: string]
  | ["running"];

type EvaluatorOptions = {
  globals: Record<string, any>;
};

class NattoEvaluator {
  constructor(panes: Pane[], options?: EvaluatorOptions);
  getPaneOutput(paneId: string, outputIndex?: number = 0): PaneOutput;
  subscribeToPaneOutput(paneId: string, outputIndex: number, callback: (output: PaneOutput) => void): () => void;
  setPaneValue(paneId: string, outputIndex: number, value: any): void;
  destroy(): void;
}
```

## Notes

- Outputs are tuples of type `PaneOutput`.
- All panes have one output (`outputIndex = 0`) except state panes, which have two outputs.
- A state pane's second output (`outputIndex = 1`) is the state setter function.
- `evaluator.subscribeToPaneOutput` and `evaluator.setPaneValue` refer to pane's first output.
- `evaluator.subscribeToPaneOutput` returns an unsubscribe function.
- Error behavior is currently undefined (todo).

## Example React usage

```js
import React from "react";

const evaluator = new NattoEvaluator(
  [
    {
      type: 0,
      expression: "<div>hi!</div>",
      babelPlugins: ["transform-react-jsx"],
      ...
    },
  ],
  { globals: { React } }
);
```
