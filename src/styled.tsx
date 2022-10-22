import React from "react";
import type { Stylesheet } from "./stylesheet";
import type { CssVars, ScopeOf } from "./types";

type SetVarsArgType<R extends string, E = ""> = Iterable<
  [varName: Exclude<CssVars<ScopeOf<R>>, E>, value: string | undefined]
>;

export type StyledProps<
  C extends keyof JSX.IntrinsicElements,
  S extends string
> = {
  stylesInBody?: boolean;
  variables?: Partial<Record<CssVars<ScopeOf<S>>, string>>;
  uniqueName?: string;
} & JSX.IntrinsicElements[C];

export const styled = <C extends keyof JSX.IntrinsicElements, S extends string>(
  Element: C,
  stylesheet: Stylesheet<S>
) =>
  React.memo(
    ({
      variables,
      stylesInBody,
      className,
      uniqueName,
      ...elementProps
    }: StyledProps<C, S>) => {
      const [styles, setStyles] = React.useState<string>("");
      const [styleInstance] = React.useState(() =>
        stylesheet["getInstance"](uniqueName, !stylesInBody)
      );

      const [setVars] = React.useState(() => (vars: SetVarsArgType<S>) => {
        let hasChanged = false;

        for (const [varName, value] of vars) {
          const v = styleInstance.variableList.getVariable(varName);
          if (v) {
            if (value) hasChanged = v.setValue(value) ? true : hasChanged;
            else hasChanged = v.unsetValue() ? true : hasChanged;
          }
        }

        if (hasChanged) {
          if (styleInstance.styleElement)
            styleInstance.styleElement.innerHTML =
              styleInstance.variableList.stringify();
          else setStyles(styleInstance.variableList.stringify());
        }
      });

      // @ts-expect-error
      useStringDictChangeEffect(
        setVars,
        (variables as Record<string, string> | undefined) ?? {}
      );

      React.useEffect(() => {
        if (styleInstance.styleElement) {
          document.head.append(styleInstance.styleElement);
          return () => styleInstance.styleElement!.remove();
        } else {
          setStyles(styleInstance.variableList.stringify());
          return () => {};
        }
      });

      const combinedClassName = React.useMemo(
        () =>
          className
            ? styleInstance.className + " " + className
            : styleInstance.className,
        [className]
      );

      if (stylesInBody) {
        return (
          <div style={{ display: "contents" }}>
            <style>{styles}</style>
            {/* @ts-expect-error */}
            <Element className={combinedClassName} {...elementProps} />
          </div>
        );
      }

      // @ts-expect-error
      return <Element className={combinedClassName} {...elementProps} />;
    }
  );
