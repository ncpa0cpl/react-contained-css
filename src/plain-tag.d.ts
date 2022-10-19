declare module "plain-tag" {
  export default function plainTag(
    strings: TemplateStringsArray,
    ...values: any[]
  ): string;
}
