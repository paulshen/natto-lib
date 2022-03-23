export type Position = [x: number, y: number];
export type Size = [w: number, h: number];
export type Rect = [x: number, y: number, w: number, h: number];

export type PaneOutput =
  | ["value", any]
  | ["error", any]
  | [type: "waiting", id?: string]
  | ["running"];

export enum PaneType {
  Evaluate = 0,
  InputText = 5,
  EvaluateGlobal = 6,
  State = 8,
  Import = 9,
  EvaluateTemplate = 10,
  EnvironmentVariable = 11,
}

export type SupportedBabelPlugin =
  | "transform-react-jsx"
  | [type: "import", url: string];

export type PaneInput = {
  id: string;
  name?: string;
  description?: string;
  source?: [paneId: string, outputIndex: number];
};

export type ImportModule =
  | [type: "npm", moduleId: string, pinUrl?: string]
  | [type: "url", url: string]
  | [type: "script", url: string];

/* unstable */
export type PaneRenderOutput =
  | ["dom"]
  | ["html"]
  | ["react"]
  | ["table"]
  | ["text"]
  | ["graphviz"]
  | [type: "custom", source?: [paneId: string, outputIndex: number]];

export enum EvaluateExpressionType {
  Expression = 1,
  FunctionBody = 2,
  Text = 3,
}

export type StateControl =
  | [type: "number", options?: { min?: number; max?: number; step?: number }]
  | [type: "boolean"]
  | [type: "select", options: { optionsExpression: string }]
  | [type: "text"];

export type Pane = {
  id: string;
  z: number;
  rect: Rect;
  name?: string;
} & (
  | {
      type: PaneType.Evaluate;
      inputs: PaneInput[];
      autorun: boolean;
      expression: string;
      editorHeight: number | undefined;
      babelPlugins?: SupportedBabelPlugin[];
      renderOutput?: PaneRenderOutput;
      // undefined = EvaluateExpressionType.Expression
      expressionType?: EvaluateExpressionType;
    }
  | {
      type: PaneType.EvaluateGlobal;
      autorun: boolean;
      expression: string;
      editorHeight?: number;
    }
  | {
      type: PaneType.EvaluateTemplate;
      templateId: string;
      templateInputSources: Record<
        string,
        [paneId: string, outputIndex: number]
      >;
      metadata: Record<string, any>;
      autorun: boolean;
      editorHeight?: number;
    }
  | {
      type: PaneType.InputText;
      text: string;
    }
  | {
      type: PaneType.State;
      initialExpression: string;
      control?: StateControl;
      editorHeight?: number;
    }
  | {
      type: PaneType.Import;
      module?: ImportModule;
      isGlobal?: boolean;
      useDefault?: boolean;
    }
  | {
      type: PaneType.EnvironmentVariable;
      key: string | undefined;
    }
);

export type PaneLayoutPaneMetadata = {
  rect: Rect;
  z: number;
  editorHeight?: number;
  hidden?: true;
};

export type PaneLayout = {
  id: string;
  name: string;
  panes: Record<string, PaneLayoutPaneMetadata>;
};

export type Canvas = {
  id: string;
  name: string;
  panes: Pane[];
  layouts: PaneLayout[];
  defaultLayoutId?: string;
  createdTime: number;
};
