import * as devtestlab from "@pulumi/azure-native/devtestlab";
import { BasicResourceArgs } from "../types";
import { Input } from "@pulumi/pulumi";

interface Props extends BasicResourceArgs {
  time: Input<string>;
  timeZone?: Input<string>;
  targetResourceId: Input<string>;
  task:
    | "LabVmAutoStart"
    | "LabVmsShutdownTask"
    | "LabVmsStartupTask"
    | "LabVmReclamationTask"
    | "ComputeVmShutdownTask"
    | Input<string>;
}

export default ({
  name,
  group,
  time,
  task,
  timeZone,
  targetResourceId,
  dependsOn,
}: Props) =>
  new devtestlab.GlobalSchedule(
    name,
    {
      name,
      ...group,
      dailyRecurrence: { time },
      timeZoneId: timeZone,
      status: "Enabled",
      targetResourceId,
      taskType: task,
      notificationSettings: {
        status: "Disabled",
        emailRecipient: "",
        notificationLocale: "en",
        timeInMinutes: 30,
        webhookUrl: "",
      },
    },
    { dependsOn },
  );
