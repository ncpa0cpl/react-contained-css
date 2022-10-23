import type {
  CssCommentAST,
  CssDeclarationAST,
  CssRuleAST,
  CssStylesheetAST,
} from "@adobe/css-tools";
import { CssTypes, parse, stringify } from "@adobe/css-tools";
import type { VarDeclaration } from "./css-variable";
import { CssVariable, VariablesListRule } from "./css-variable";
import { generateID } from "./utils/generate-id";

const createAst = <A extends CssStylesheetAST>(v: A) => v;

export class Stylesheet<R extends string> {
  readonly stylesheetID = generateID(8);

  private stylesElement?: HTMLStyleElement;
  private scopeVariables: VarDeclaration[] = [];
  private isInitiated = false;
  private parsedCss = "";

  constructor(rules: R) {
    this.stylesElement = document && document.createElement("style");

    const ast = parse(rules);

    const scopeIndex = ast.stylesheet.rules.findIndex(
      (r) => r.type === "rule" && r.selectors.includes(":scope")
    );

    const newScopeAst = createAst({
      type: CssTypes.stylesheet,
      stylesheet: {
        rules: [
          {
            type: CssTypes.rule,
            selectors: ["." + this.stylesheetID],
            declarations: [] as (CssDeclarationAST | CssCommentAST)[],
          },
        ],
      },
    });

    if (scopeIndex !== -1) {
      const org = ast.stylesheet.rules[scopeIndex] as CssRuleAST;

      for (const declaration of org.declarations) {
        if (declaration.type === CssTypes.declaration) {
          if (declaration.property.startsWith("--")) {
            this.scopeVariables.push(declaration);
          } else {
            newScopeAst.stylesheet.rules[0]!.declarations.push(declaration);
          }
        } else {
          newScopeAst.stylesheet.rules[0]!.declarations.push(declaration);
        }
      }

      ast.stylesheet.rules.splice(scopeIndex, 1);
    }

    const variableReplaceMap = new Map<string, string>();

    for (const variable of this.scopeVariables) {
      variableReplaceMap.set(
        variable.property,
        CssVariable.getScopedNameFor(variable.property, this.stylesheetID)
      );
    }

    // replace all variable names with scoped names
    const replaceVariableNamesInAst = (
      localAst: CssStylesheetAST,
      replaceSelectors: boolean
    ) => {
      const selectorMapFn = replaceSelectors
        ? (s: string) => "." + this.stylesheetID + " " + s
        : (s: string) => s;

      for (const rule of localAst.stylesheet.rules) {
        if (rule.type === CssTypes.rule) {
          rule.selectors = rule.selectors.map(selectorMapFn);

          for (const declaration of rule.declarations) {
            if (declaration.type === CssTypes.declaration) {
              if (declaration.property.slice(0, 2) == "--") {
                const scopedName = variableReplaceMap.get(declaration.property);
                if (scopedName) {
                  declaration.property = scopedName;
                }
              } else if (declaration.value.includes("var(")) {
                type FoundVar = {
                  name: string;
                  start: number;
                  end: number;
                };

                const foundVars: Array<FoundVar> = [];
                let nextIndex = 0;

                while (
                  (nextIndex = declaration.value.indexOf(
                    "var(--",
                    nextIndex
                  )) !== -1
                ) {
                  const variable: FoundVar = {
                    name: "--",
                    start: nextIndex + 4,
                    end: nextIndex + 4,
                  };

                  let j = nextIndex + 6;

                  for (
                    ;
                    declaration.value[j] !== " " &&
                    declaration.value[j] !== "," &&
                    declaration.value[j] !== ")";
                    j++
                  ) {
                    variable.name += declaration.value[j];
                  }

                  variable.end = variable.start + variable.name.length;
                  foundVars.push(variable);

                  nextIndex += 6;
                }

                const resultChars: string[] = [];
                let prevEnd = 0;
                for (const variable of foundVars) {
                  const scopedName = variableReplaceMap.get(variable.name);
                  if (scopedName) {
                    resultChars.push(
                      declaration.value.slice(prevEnd, variable.start),
                      scopedName
                    );
                  } else {
                    resultChars.push(
                      declaration.value.slice(prevEnd, variable.start),
                      variable.name
                    );
                  }
                  prevEnd = variable.end;
                }
                resultChars.push(declaration.value.slice(prevEnd));

                let value = "";
                let first = true;

                for (let i = 0; i < resultChars.length; i++) {
                  if (first) {
                    first = false;
                    value = resultChars[i]!;
                  } else {
                    value += resultChars[i]!;
                  }
                }

                declaration.value = value;
              }
            }
          }
        }
      }
    };

    replaceVariableNamesInAst(ast, true);

    if (newScopeAst.stylesheet.rules[0]!.declarations.length > 0) {
      replaceVariableNamesInAst(newScopeAst, false);
      this.parsedCss +=
        stringify(newScopeAst, { compress: false, indent: "  " }) + "\n";
    }

    this.parsedCss += stringify(ast, { compress: false, indent: "  " });

    if (this.stylesElement) this.stylesElement.innerHTML = this.parsedCss;
  }

  private initiate() {
    if (!this.isInitiated && this.stylesElement) {
      document.head.append(this.stylesElement);
      this.isInitiated = true;
    }
  }

  protected getInstance(name = "", includeStyleElement = true) {
    this.initiate();

    const className = name + "-" + generateID(8);
    const containerStyles =
      includeStyleElement && document ? document.createElement("style") : null;

    const varList = new VariablesListRule(
      "." + this.stylesheetID + "." + className,
      this.stylesheetID
    );

    if (this.scopeVariables.length > 0) {
      for (const variable of this.scopeVariables) {
        varList.addVariable(variable);
      }
    }

    if (containerStyles) containerStyles.innerHTML = varList.stringify();

    return {
      className: this.stylesheetID + " " + className,
      styleElement: containerStyles,
      variableList: varList,
    };
  }

  getParsedCss() {
    return this.parsedCss;
  }
}

export const css = <S extends string>(styles: S) => {
  return new Stylesheet(styles);
};
