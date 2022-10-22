import React from "react";

export const useStringDictChangeEffect = (
  onChange: (
    changedProperties: Set<[string, string | undefined]>
  ) => void | (() => void),
  dict: Record<string, string>
) => {
  const prev = React.useRef(new Map<string, string>());
  const cleanup = React.useRef<(() => void) | undefined>();

  React.useEffect(() => {
    const dictKeys = Object.keys(dict);
    const changedProperties = new Set<[string, string | undefined]>();

    for (const key of dictKeys) {
      if (!prev.current.has(key) || prev.current.get(key) !== dict[key]) {
        changedProperties.add([key, dict[key]!] as [string, string]);
        prev.current.set(key, dict[key]!);
      }
    }

    for (const prevKey of prev.current.keys()) {
      let found = false;

      for (const dictKey of dictKeys) {
        if (dictKey === prevKey) {
          found = true;
          break;
        }
      }

      if (!found) {
        changedProperties.add([prevKey, undefined]);
        prev.current.delete(prevKey);
      }
    }

    if (changedProperties.size > 0) {
      if (cleanup.current) cleanup.current();
      // @ts-expect-error
      cleanup.current = onChange(changedProperties);
    }
  });
};
