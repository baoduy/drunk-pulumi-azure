//Requests
export interface NetworkRouteRequest {
  id: string;
  location: string;
  properties: NetworkRouteRequestProperties;
}

export interface NetworkRouteRequestProperties {
  disableBgpRoutePropagation: boolean;
  routes: RouteRequest[];
}

export interface RouteRequest {
  name: string;
  properties: RouteRequestProperties;
}

export interface RouteRequestProperties {
  addressPrefix: string;
  nextHopType: string;
  nextHopIpAddress?: string;
}

//Results
export interface NetworkRouteResult {
  name: string;
  id: string;
  etag: string;
  type: string;
  location: string;
  properties: NetworkRouteProperties;
}

export interface NetworkRouteProperties {
  provisioningState: string;
  resourceGuid: string;
  disableBgpRoutePropagation: boolean;
  routes: Route[];
  subnets: Subnet[];
}

export interface Route {
  name: string;
  id: string;
  etag: string;
  properties: RouteProperties;
  type: string;
}

export interface RouteProperties {
  provisioningState: string;
  addressPrefix: string;
  nextHopType: string;
  hasBgpOverride: boolean;
  nextHopIpAddress?: string;
}

export interface Subnet {
  id: string;
}
