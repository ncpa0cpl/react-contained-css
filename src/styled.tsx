import React from "react";
import type { Stylesheet } from "./stylesheet";
import type { CssVars, ScopeOf } from "./types";
import { useStringDictChangeEffect } from "./utils/use-string-dict-change-effect";

type SetVarsArgType<R extends string, E = ""> = Iterable<
  [varName: Exclude<CssVars<ScopeOf<R>>, E>, value: string | undefined]
>;

export type StyledAdditionalProps<S extends string> = {
  stylesInBody?: boolean;
  variables?: Partial<Record<CssVars<ScopeOf<S>>, string>>;
  uniqueName?: string;
};

export type StyledProps<
  C extends keyof JSX.IntrinsicElements,
  S extends string
> = StyledAdditionalProps<S> & JSX.IntrinsicElements[C];

export const styled = <C extends keyof JSX.IntrinsicElements, S extends string>(
  Element: C,
  stylesheet: Stylesheet<S>,
  defaults?: StyledAdditionalProps<S>
) =>
  React.memo(
    ({
      variables = defaults?.variables,
      stylesInBody = defaults?.stylesInBody,
      uniqueName = defaults?.uniqueName,
      className,
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

      useStringDictChangeEffect(
        // @ts-expect-error
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
      }, []);

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
