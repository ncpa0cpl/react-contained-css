export type VarDeclaration = {
  type: "declaration";
  property: string;
  value: string;
};

export class CssVariable {
  static getScopedNameFor(originalName: string, parentID: string) {
    return `--${parentID}-${originalName.slice(2)}`;
  }

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
    return result;
  }

  unsetValue(): boolean {
    const result = this.value !== undefined;
    this.value = undefined;
    return result;
  }

  stringify(): string {
    return `${this.scopedName}: ${this.value ?? this.defaultValue};`;
  }
}

export class VariablesListRule {
  readonly variables: CssVariable[] = [];
  private lineNumber = 1;

  constructor(private selector: string, private parentID: string) {}

  addVariable(variable: VarDeclaration, value?: string) {
    const v = new CssVariable(variable, this.parentID, this.lineNumber++);
    this.variables.push(v);

    if (value) {
      v.setValue(value);
    }
  }

  getVariable(name: string) {
    return this.variables.find((v) => v.inJsName === name);
  }

  stringify() {
    const lastLineNumber = this.lineNumber;

    const lines = Array.from({ length: lastLineNumber + 1 }, () => "");
    lines[0] = `${this.selector} {`;
    lines[lines.length - 1] = "}";

    for (const variable of this.variables) {
      lines[variable.line] = "  " + variable.stringify();
    }

    return lines.join("\n");
  }
}
