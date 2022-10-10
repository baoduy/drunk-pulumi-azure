export const defaultDotNetConfig = {
  COMPlus_EnableDiagnostics: '0',
  ASPNETCORE_URLS: 'http://*:8080',
  //ASPNETCORE_ENVIRONMENT: 'Production',
  AllowedHosts: '*',

  Logging__LogLevel__Default: 'Warning',
  Logging__LogLevel__System: 'Error',
  Logging__LogLevel__Microsoft: 'Error',
  Console__IncludeScopes: 'false',
  Console__LogLevel__Default: 'Warning',
  Console__LogLevel__System: 'Error',
  Console__LogLevel__Microsoft: 'Error',
  Debug__LogLevel__Default: 'None',
  Debug__LogLevel__System: 'None',
  Debug__LogLevel__Microsoft: 'None',
};
