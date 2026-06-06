declare module "*.svg" {
  import React = require("react");
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

type ProviderType = "google" | "manual" | "facebook" | "apple" | "linkedin";

interface User {
  _id: string;
  name: string;
  email: string;
  active?: boolean;
  role: "USER" | "ADMIN";
  blocked?: boolean;
  blockReason?: string;
  provider: ProviderType;
  facebookId?: string;
  image?: string;
  linkedinId?: string;
  createdAt: string;
}

interface ApiResponse<T> {
  data: T;
  message: string;
  sucess: boolean;
}
