import creator from "../../Storage";
import "../_tools/Mocks";
import { expect } from "chai";

describe("Storage Creator tests", () => {
  it("Storage Creator", async () => {
    const rs = creator({
      name: "storage",
      group: { resourceGroupName: "RG" },
      defaultManagementRules: [
        {
          actions: {
            baseBlob: {
              delete: {
                daysAfterModificationGreaterThan: 365,
                daysAfterLastAccessTimeGreaterThan: 365,
              },
              tierToCool: {
                daysAfterModificationGreaterThan: 365,
                daysAfterLastAccessTimeGreaterThan: 365,
              },
              tierToArchive: {
                daysAfterModificationGreaterThan: 365 * 3,
                daysAfterLastAccessTimeGreaterThan: 365 / 2,
              },
              enableAutoTierToHotFromCool: true,
            },
            snapshot: { delete: { daysAfterCreationGreaterThan: 365 } },
            version: { delete: { daysAfterCreationGreaterThan: 365 } },
          },
          filters: {
            blobTypes: ["blockBlob", "appendBlob"],
            containerNames: [
              "insights-logs-auditevent",
              "insights-metrics-pt1m",
              "$logs",
            ],
          },
        },
      ],
    });

    (rs.storage as any).accountName.apply((n) =>
      expect(n).to.equal("teststackstoragestg")
    );
  });

  it("Storage Creator", async () => {
    const rs = creator({
      name: "storage",
      featureFlags: { allowSharedKeyAccess: true, enableStaticWebsite: true },
      group: { resourceGroupName: "RG" },
    });

    (rs.storage as any).allowSharedKeyAccess.apply((n) =>
      expect(n).to.equal(true)
    );
  });
});
