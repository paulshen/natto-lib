import { reaction, runInAction } from "mobx";
import { Atom } from "./atom";
import { initPanes } from "./eval";
import { Pane, PaneOutput } from "./types";

export class NattoEvaluator {
  paneAtoms: Record<string, Atom<PaneOutput>[]>;
  disposers: (() => void)[];

  constructor(panes: Pane[]) {
    [this.paneAtoms, this.disposers] = initPanes(panes);
  }

  getPaneOutput(paneId: string, outputIndex: number = 0): PaneOutput {
    return this.paneAtoms[paneId][outputIndex].value;
  }

  subscribeToPaneOutput(
    paneId: string,
    outputIndex: number,
    callback: (output: PaneOutput) => void
  ): () => void {
    return reaction(
      () => this.paneAtoms[paneId][outputIndex].value,
      (output) => {
        callback(output);
      }
    );
  }

  setPaneValue(paneId: string, outputIndex: number, value: any): void {
    runInAction(() => {
      this.paneAtoms[paneId][outputIndex].value = ["value", value];
    });
  }

  destroy(): void {
    this.disposers.forEach((dispose) => {
      dispose();
    });
  }
}
