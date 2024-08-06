import * as native from '@pulumi/azure-native';
import { randomUuId } from '../Core/Random';
import { getWebTestName, getAlertName } from '../Common';
import * as pulumi from '@pulumi/pulumi';
import { ResourceInfo } from '../types';

interface InsightMonitorProps {
  name: string;
  alertGroupAction?: {
    resourceGroupName: string;
    actionGroupName: string;
  };
  appInsight: ResourceInfo;
  url: string;
  frequency?: 300 | 600 | 900;
}

export const addInsightMonitor = ({
  name,
  alertGroupAction,
  appInsight,
  url,
  frequency = 900,
}: InsightMonitorProps) => {
  const guid = randomUuId(`${name}-WebTest`).result;
  if (!url.includes('https')) url = `https://${url}`;

  pulumi.all([guid, appInsight.id]).apply(async ([g, id]) => {
    if (!g) return;

    const webTest = new native.insights.WebTest(name, {
      webTestName: getWebTestName(name),
      resourceGroupName: appInsight.group.resourceGroupName,
      syntheticMonitorId: g,

      description: `Health check ${name}`,
      webTestKind: native.insights.WebTestKind.Ping,
      kind: 'ping',
      locations: [
        { location: 'apac-sg-sin-azr' },
        { location: 'apac-hk-hkn-azr' },
        { location: 'emea-au-syd-edge' },
      ],
      enabled: true,
      retryEnabled: true,
      frequency,
      //default timeout is 30s
      //timeout:'',

      configuration: {
        webTest: `
        <WebTest Name="${name}" Id="${g}" Enabled="True" CssProjectStructure="" CssIteration="" Timeout="30" WorkItemIds=""
            xmlns="http://microsoft.com/schemas/VisualStudio/TeamTest/2010" Description="" CredentialUserName="" CredentialPassword="" PreAuthenticate="False" Proxy="default" StopOnError="False" RecordedResultFile="" ResultsLocale="" >
            <Items>
                <Request Method="GET" Guid="${g}" Version="1.1" Url="${url}" ThinkTime="0" Timeout="30" ParseDependentRequests="False" FollowRedirects="False" RecordResult="True" Cache="False" ResponseTimeGoal="0" Encoding="utf-8" ExpectedHttpStatusCode="200" ExpectedResponseUrl="" ReportingName="" IgnoreHttpStatusCode="False" />
            </Items>
        </WebTest>`,
      },

      tags: {
        [`hidden-link:${id}`]: 'Resource',
      },
    });

    //Enable Alert
    if (alertGroupAction) {
      const alertGroup = await native.insights.getActionGroup(alertGroupAction);

      const alertName = getAlertName(name);
      new native.insights.MetricAlert(alertName, {
        resourceGroupName: appInsight.group.resourceGroupName,
        enabled: true,
        scopes: [webTest.id, appInsight.id],
        severity: 100,
        evaluationFrequency: 'PT15M',
        criteria: {
          webTestId: webTest.id,
          componentId: id,
          failedLocationCount: webTest.locations.length,
          odataType:
            'Microsoft.Azure.Monitor.WebtestLocationAvailabilityCriteria',
        },
        windowSize: 'PT15M',
        actions: [{ actionGroupId: alertGroup.id }],
      });
    }
  });
};
