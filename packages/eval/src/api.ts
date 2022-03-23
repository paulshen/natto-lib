import { reaction, runInAction } from "mobx";
import { Atom } from "./atom";
import { EvaluatorOptions, initPanes } from "./eval";
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

  setPaneValue(paneId: string, value: any): void {
    runInAction(() => {
      this.paneAtoms[paneId][0].value = ["value", value];
    });
  }

  destroy(): void {
    this.disposers.forEach((dispose) => {
      dispose();
    });
  }
}
