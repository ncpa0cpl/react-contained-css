import React from "react";
import type { Stylesheet } from "./stylesheet";
import type { CssVars, ScopeOf } from "./types";

type SetVarsArgType<R extends string, E = ""> = [
  varName: Exclude<CssVars<ScopeOf<R>>, E>,
  value: string | undefined
][];

export const useStylesheet = <R extends string, V = {}>(
  stylesheet: Stylesheet<R>,
  variables: Partial<Record<CssVars<ScopeOf<R>>, string>> & V = {} as any
) => {
  const [styleInstance] = React.useState(() => stylesheet["getInstance"]());

  const [setVars] = React.useState(() => (vars: SetVarsArgType<R>) => {
    let hasChanged = false;

    for (const [varName, value] of vars) {
      const v = styleInstance.variableList.getVariable(varName);
      if (v) {
        if (value) hasChanged = v.setValue(value) ? true : hasChanged;
        else hasChanged = v.unsetValue() ? true : hasChanged;
      }
    }

    if (hasChanged)
      styleInstance.stylesElement.innerHTML =
        styleInstance.variableList.stringify();
  });

  const prevVariables = React.useRef<Record<string, string>>({});

  React.useEffect(() => {
    setTimeout(() => {
      const varsToUpdate: SetVarsArgType<R> = [];

      for (const [key, value] of Object.entries(variables)) {
        if (
          !(key in prevVariables.current) ||
          prevVariables.current[key] !== value
        ) {
          // @ts-expect-error
          varsToUpdate.push([key, value]);
        }
      }

      for (const key of Object.keys(prevVariables.current)) {
        if (!(key in variables)) {
          // @ts-expect-error
          varsToUpdate.push([key, undefined]);
        }
      }

      if (varsToUpdate.length > 0) {
        prevVariables.current = variables as Record<string, string>;
        setVars(varsToUpdate);
      }
    }, 0);
  }, [Object.keys(variables).join(","), Object.values(variables).join(",")]);

  React.useEffect(() => {
    document.head.append(styleInstance.stylesElement);
    return () => styleInstance.stylesElement.remove();
  });

  return {
    className: styleInstance.className,
    setVars(...vars: SetVarsArgType<R, keyof V>) {
      return setVars(vars);
    },
  };
};
