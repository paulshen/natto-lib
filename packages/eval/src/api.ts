import { reaction, runInAction, when } from "mobx";
import { Atom } from "./atom";
import { EvaluatorOptions, initPanes } from "./evaluator";
import { Pane, PaneOutput } from "./types";

export class NattoEvaluator {
  paneAtoms: Record<string, Atom<PaneOutput>[]>;
  disposers: (() => void)[];

  constructor(panes: Pane[], options: EvaluatorOptions = {}) {
    [this.paneAtoms, this.disposers] = initPanes(panes, options);
  }

  getPaneOutput(paneId: string, outputIndex: number = 0): PaneOutput {
    return this.paneAtoms[paneId][outputIndex].value;
  }

  async getPaneValue(paneId: string, outputIndex: number = 0): Promise<any> {
    const paneAtom = this.paneAtoms[paneId][outputIndex];
    const output = paneAtom.value;
    if (output[0] === "value") {
      return output[1];
    }
    await when(() => paneAtom.value[0] === "value");
    return paneAtom.value[1];
  }

  subscribeToPaneOutput(
    paneId: string,
    callback: (output: PaneOutput) => void
  ): () => void {
    return reaction(
      () => this.paneAtoms[paneId][0].value,
      (output) => {
        callback(output);
      }
    );
  }

  destroy(): void {
    this.disposers.forEach((dispose) => {
      dispose();
    });
  }
}
