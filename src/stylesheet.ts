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

  private stylesElement: HTMLStyleElement;
  private scopeVariables: VarDeclaration[] = [];
  private isInitiated = false;

  constructor(rules: R) {
    this.stylesElement = document.createElement("style");
    let mainCss = "";

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
              if (declaration.property.startsWith("--")) {
                const scopedName = variableReplaceMap.get(declaration.property);
                if (scopedName) {
                  declaration.property = scopedName;
                }
              } else if (declaration.value.includes("var(")) {
                // TODO: optimize this
                const reg = /var\((--[\w-]+)(?:.)*\)/g;

                const getCaptureGroups = (
                  str: string,
                  groups: Set<string> = new Set()
                ): Set<string> => {
                  const match = reg.exec(str);
                  if (match && match[1]) {
                    groups.add(match[1]);
                    return getCaptureGroups(str, groups);
                  }
                  return groups;
                };

                const usedVariables = getCaptureGroups(declaration.value);

                for (const variable of usedVariables) {
                  const scopedName = variableReplaceMap.get(variable);
                  if (scopedName) {
                    declaration.value = declaration.value.replaceAll(
                      `var(${variable}`,
                      `var(${scopedName}`
                    );
                  }
                }
              }
            }
          }
        }
      }
    };

    replaceVariableNamesInAst(ast, true);

    if (newScopeAst.stylesheet.rules[0]!.declarations.length > 0) {
      replaceVariableNamesInAst(newScopeAst, false);
      mainCss +=
        stringify(newScopeAst, { compress: false, indent: "  " }) + "\n";
    }

    mainCss += stringify(ast, { compress: false, indent: "  " });

    this.stylesElement.innerHTML = mainCss;
  }

  private initiate() {
    if (!this.isInitiated) {
      document.head.append(this.stylesElement);
      this.isInitiated = true;
    }
  }

  protected getInstance(name = "", includeStyleElement = true) {
    this.initiate();

    const className = name + "-" + generateID(8);
    const containerStyles = includeStyleElement
      ? document.createElement("style")
      : null;

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
}

export const css = <S extends string>(styles: S) => {
  return new Stylesheet(styles);
};
