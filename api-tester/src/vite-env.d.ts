/// <reference types="vite/client" />

declare module "*.chor?raw" {
  const content: string;
  export default content;
}

declare module "*.traj?raw" {
  const content: string;
  export default content;
}
