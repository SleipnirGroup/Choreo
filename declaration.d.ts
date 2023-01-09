declare module "*.module.css" {
  const content: Record<string, string>;
  export default content;
}

declare module "*.json" {
  const content: Record<string, any>;
  export default content;
}
