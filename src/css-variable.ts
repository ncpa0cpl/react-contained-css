export type VarDeclaration = {
  type: "declaration";
  property: string;
  value: string;
};

export class CssVariable {
  static getScopedNameFor(originalName: string, parentID: string) {
    return "--" + parentID + "-" + originalName.slice(2);
  }

  onChange: (v: CssVariable) => void = () => {};

  readonly inJsName: string;
  readonly originalName: string;
  readonly scopedName: string;
  readonly defaultValue: string;
  readonly line: number;

  private value: string | undefined;

  constructor(declaration: VarDeclaration, parentID: string, line: number) {
    this.line = line;
    this.inJsName = declaration.property.slice(2);
    this.originalName = declaration.property;
    this.scopedName = CssVariable.getScopedNameFor(this.originalName, parentID);
    this.defaultValue = declaration.value;
  }

  setValue(value: string): boolean {
    const result = this.value !== value;
    this.value = value;
    if (result) this.onChange(this);
    return result;
  }

  unsetValue(): boolean {
    const result = this.value !== undefined;
    this.value = undefined;
    if (result) this.onChange(this);
    return result;
  }

  stringify(): string {
    return this.scopedName + ": " + (this.value ?? this.defaultValue) + ";";
  }
}

export class VariablesListRule {
  private changedVars: CssVariable[] = [];
  readonly variables: CssVariable[] = [];
  readonly variableMap = new Map<string, CssVariable>();
  private lineNumber = 1;

  constructor(private selector: string, private parentID: string) {}

  private onVariableChange = (variable: CssVariable) => {
    this.changedVars.push(variable);
  };

  addVariable(variable: VarDeclaration) {
    const v = new CssVariable(variable, this.parentID, this.lineNumber++);
    v.onChange = this.onVariableChange;

    this.variables.push(v);
    this.variableMap.set(v.inJsName, v);
  }

  getVariable(name: string) {
    return this.variableMap.get(name);
  }

  private linesCache: string[] | undefined = undefined;

  stringify() {
    const lastLineNumber = this.lineNumber;

    if (this.linesCache === undefined) {
      this.linesCache = Array.from({ length: lastLineNumber + 1 }, () => "");
      this.linesCache[0] = this.selector + " {";
      this.linesCache[this.linesCache.length - 1] = "}";

      for (const variable of this.variables) {
        this.linesCache[variable.line] = "  " + variable.stringify();
      }

      this.changedVars = [];
    } else {
      for (const variable of this.changedVars) {
        this.linesCache[variable.line] = "  " + variable.stringify();
      }

      this.changedVars = [];
    }

    let result = "";
    let first = true;

    for (const line of this.linesCache) {
      if (first) {
        first = false;
        result = line;
      } else {
        result += "\n" + line;
      }
    }

    return result;
  }
}
