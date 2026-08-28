import { createdResources } from './Mocks';

// Some builders (ServiceBusBuilder/AcrBuilder) keep the network rule-set/
// registry resource private, only returning a top-level ResourceInfo, and
// that resource's inputs can depend on an Output off another resource, so
// its mock registration lands a few microtask hops after build() returns —
// poll the shared capture list instead of asserting synchronously.
export const waitForResource = async (type: string, before: number) => {
  for (let i = 0; i < 50; i++) {
    const found = createdResources.slice(before).find((r) => r.type === type);
    if (found) return found.inputs;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error(`${type} was not created in time`);
};
