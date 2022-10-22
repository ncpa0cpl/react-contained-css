import React from "react";
import type { Stylesheet } from "./stylesheet";
import type { CssVars, ScopeOf } from "./types";
import { useStringDictChangeEffect } from "./utils/use-string-dict-change-effect";

type SetVarsArgType<R extends string, E = ""> = Iterable<
  [varName: Exclude<CssVars<ScopeOf<R>>, E>, value: string | undefined]
>;

export const useStylesheet = <R extends string, V = {}>(
  stylesheet: Stylesheet<R>,
  variables: Partial<Record<CssVars<ScopeOf<R>>, string>> & V = {} as any
) => {
  const [styleInstance] = React.useState(() =>
    stylesheet["getInstance"](undefined, true)
  );

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
      styleInstance.styleElement!.innerHTML =
        styleInstance.variableList.stringify();
  });

  // @ts-expect-error
  useStringDictChangeEffect(setVars, variables as Record<string, string>);

  React.useEffect(() => {
    document.head.append(styleInstance.styleElement!);
    return () => styleInstance.styleElement!.remove();
  });

  return {
    className: styleInstance.className,
    setVars(
      ...vars: [
        varName: Exclude<CssVars<ScopeOf<R>>, keyof V>,
        value: string | undefined
      ][]
    ) {
      return setVars(vars);
    },
  };
};
