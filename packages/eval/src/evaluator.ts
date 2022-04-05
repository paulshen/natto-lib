import { action, autorun, runInAction } from "mobx";
import { Atom, atom } from "./atom";
import {
  EvaluateExpressionType,
  Pane,
  PaneInput,
  PaneOutput,
  PaneType,
} from "./types";

function createStateOutputAtoms(
  pane: Extract<Pane, { type: PaneType.State }>
): Atom<PaneOutput>[] {
  let initialValue: PaneOutput;
  if (pane.initialExpression.trim() !== "") {
    try {
      const f = new Function(`return ${pane.initialExpression}`);
      initialValue = ["value", f()];
    } catch (e) {
      initialValue = ["error", e];
    }
  } else {
    initialValue = ["waiting"];
  }
  const outputAtom = atom(initialValue);
  return [
    outputAtom,
    atom([
      "value",
      action((value: any) => {
        if (typeof value === "function") {
          try {
            const newValue = value(
              outputAtom.value[0] === "value" ? outputAtom.value[1] : undefined
            );
            outputAtom.value = ["value", newValue];
          } catch {}
        } else {
          outputAtom.value = ["value", value];
        }
      }),
    ]),
  ];
}

function isEmptyEvalExpression(expression: string) {
  return expression.split("\n").every((line) => {
    const trimmed = line.trim();
    return trimmed === "" || trimmed.startsWith("//");
  });
}

const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;

async function createAsyncFunction(
  pane: Extract<Pane, { type: PaneType.Evaluate }>,
  namedInputs: PaneInput[],
  globalEntries: [name: string, value: any][]
): Promise<typeof AsyncFunction> {
  if (pane.expressionType === EvaluateExpressionType.Text) {
    return async () => pane.expression;
  } else {
    const codePrefix =
      pane.expressionType === EvaluateExpressionType.FunctionBody
        ? ""
        : `return ${!isEmptyEvalExpression(pane.expression) ? "(" : ""}`;
    let code = `${codePrefix}${pane.expression}${
      codePrefix.endsWith("(") ? ")" : ""
    }`;
    if (pane.babelPlugins !== undefined && pane.babelPlugins.length > 0) {
      if (pane.babelPlugins.some((babelPlugin) => Array.isArray(babelPlugin))) {
        throw new Error("imported babel plugins are not yet supported");
      }
      const babel = (await import("@babel/standalone")).default;
      code = babel.transform(code, {
        plugins: pane.babelPlugins,
        parserOpts: {
          allowReturnOutsideFunction: true,
        },
      }).code;
    }
    return new AsyncFunction(
      ...globalEntries.map(([name]) => name),
      ...namedInputs.map((i) => i.name),
      code
    );
  }
}

function setupEvaluator(
  pane: Extract<Pane, { type: PaneType.Evaluate }>,
  outputAtom: Atom<PaneOutput>,
  outputAtomsMap: Record<string, Atom<PaneOutput>[]>,
  evaluatorOptions: EvaluatorOptions
): () => void {
  const namedInputs: PaneInput[] = [];
  const globalEntries =
    evaluatorOptions.globals !== undefined
      ? Object.entries(evaluatorOptions.globals)
      : [];
  for (const paneInput of pane.inputs) {
    if (paneInput.source === undefined) {
      throw new Error("missing input source");
    }
    if (paneInput.name !== undefined) {
      namedInputs.push(paneInput);
    }
  }
  let dispose: (() => void) | undefined;
  let isDisposed = false;
  async function go() {
    const f = await createAsyncFunction(pane, namedInputs, globalEntries);
    let runId = 1;
    if (isDisposed) {
      return;
    }
    dispose = autorun(async () => {
      runId++;
      const thisRunId = runId;

      const namedInputValues = [];
      for (const namedInput of namedInputs) {
        if (namedInput.source === undefined) {
          // This pane has a input that's not connected. This will never run.
          return;
        }
        const [inputPaneId, outputIndex] = namedInput.source;
        const inputAtom = outputAtomsMap[inputPaneId][outputIndex];
        if (inputAtom.value[0] !== "value") {
          runInAction(() => {
            outputAtom.value = ["waiting"];
          });
          return;
        }
        namedInputValues.push(inputAtom.value[1]);
      }

      try {
        const rv = f(
          ...globalEntries.map(([, value]) => value),
          ...namedInputValues
        );
        let didComplete = false;
        const [promiseValue] = await Promise.all([
          rv.then((v: any) => {
            didComplete = true;
            return v;
          }),
          Promise.resolve().then(() => {
            if (!didComplete && thisRunId === runId) {
              runInAction(() => {
                outputAtom.value = ["running"];
              });
            }
          }),
        ]);
        runInAction(() => {
          outputAtom.value = ["value", promiseValue];
        });
      } catch (e) {
        if (thisRunId === runId) {
          runInAction(() => {
            outputAtom.value = ["error", e];
          });
        }
      }
    });
  }
  go();
  return () => {
    isDisposed = true;
    dispose?.();
  };
}

async function setupImport(
  pane: Extract<Pane, { type: PaneType.Import }>,
  outputAtom: Atom<PaneOutput>
) {
  const paneModule = pane.module;
  if (paneModule === undefined) {
    return;
  }
  if (paneModule[0] === "script") {
    const scriptElement = document.createElement("script");
    const scriptUrl = paneModule[1];
    scriptElement.onload = action(() => {
      outputAtom.value = ["value", {}];
    });
    scriptElement.onerror = action(() => {
      outputAtom.value = ["error", undefined];
    });
    scriptElement.src = scriptUrl;
    document.head.appendChild(scriptElement);
  } else {
    const moduleId = paneModule[1];
    const moduleUrl =
      paneModule[0] === "npm"
        ? paneModule[2] ?? `https://cdn.skypack.dev/${moduleId}`
        : paneModule[0] === "url"
        ? paneModule[1]
        : paneModule[1];
    try {
      const module = await import(moduleUrl);
      runInAction(() => {
        outputAtom.value = ["value", pane.useDefault ? module.default : module];
      });
    } catch (e) {
      runInAction(() => {
        outputAtom.value = ["error", e];
      });
    }
  }
}

export type EvaluatorOptions = {
  globals?: Record<string, any>;
};

export function initPanes(
  panes: Pane[],
  evaluatorOptions: EvaluatorOptions
): [
  outputAtoms: Record<string, Atom<PaneOutput>[]>,
  disposers: (() => void)[]
] {
  const outputAtoms: Record<string, Atom<PaneOutput>[]> = Object.fromEntries(
    panes.map((pane) => {
      switch (pane.type) {
        case PaneType.Evaluate:
        case PaneType.Import: {
          return [pane.id, [atom(["waiting"])]];
        }
        case PaneType.InputText: {
          return [pane.id, [atom(["value", pane.text])]];
        }
        case PaneType.State: {
          return [pane.id, createStateOutputAtoms(pane)];
        }
        default: {
          throw new Error(`PaneType not yet implemented: ${pane.type}`);
        }
      }
    })
  );
  const disposers: (() => void)[] = [];
  panes.forEach((pane) => {
    switch (pane.type) {
      case PaneType.Evaluate: {
        disposers.push(
          setupEvaluator(
            pane,
            outputAtoms[pane.id][0],
            outputAtoms,
            evaluatorOptions
          )
        );
        break;
      }
      case PaneType.Import: {
        setupImport(pane, outputAtoms[pane.id][0]);
        break;
      }
      case PaneType.State:
      case PaneType.InputText: {
        break;
      }
      default: {
        throw new Error(`PaneType not yet implemented: ${pane.type}`);
      }
    }
  });
  return [outputAtoms, disposers];
}
