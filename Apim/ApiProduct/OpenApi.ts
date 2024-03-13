/**
 * Validation schema for OpenAPI Specification 3.0.X.
 */
export interface OpenAPI3 {
  components?: Components;
  externalDocs?: ExternalDocumentation;
  info: Info;
  openapi: string;
  paths: Paths;
  security?: { [key: string]: string[] }[];
  servers?: Server[];
  tags?: Tag[];
}

export interface Components {
  callbacks?: { [key: string]: any };
  examples?: { [key: string]: any };
  headers?: { [key: string]: any };
  links?: { [key: string]: any };
  parameters?: { [key: string]: any };
  requestBodies?: { [key: string]: any };
  responses?: { [key: string]: any };
  schemas?: { [key: string]: any };
  securitySchemes?: { [key: string]: any };
}

export interface ExternalDocumentation {
  description?: string;
  url: string;
}

export interface Info {
  contact?: Contact;
  description?: string;
  license?: License;
  termsOfService?: string;
  title: string;
  version: string;
}

export interface Contact {
  email?: string;
  name?: string;
  url?: string;
}

export interface License {
  name: string;
  url?: string;
}

export interface Paths {
  [key: string]: any;
}

export interface Server {
  description?: string;
  url: string;
  variables?: { [key: string]: ServerVariable };
}

export interface ServerVariable {
  default: string;
  description?: string;
  enum?: string[];
}

export interface Tag {
  description?: string;
  externalDocs?: ExternalDocumentation;
  name: string;
}
