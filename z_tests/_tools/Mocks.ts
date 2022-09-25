import * as pulumi from '@pulumi/pulumi';

const tryFindName = (props: any) => {
  let name: string = props.name || props.resourceName;

  if (!name) {
    const keys = Object.keys(props);
    //Try to find the name that is not a resourceGroupName
    let key = keys.find((k) => k.endsWith('Name'));

    if (key) {
      name = props[key];
    }
  }
  //if (!name) console.error('Unable to find name', props);
  return name;
};

export default pulumi.runtime.setMocks({
  newResource: (
    args: pulumi.runtime.MockResourceArgs
  ): {
    id: string;
    name: string;
    state: any;
  } => {
    const name = tryFindName(args.inputs);
    //console.log(`Mocks resource ${name}`);

    return {
      id: `/subscriptions/12345/resourceGroups/resr-group/providers/${name}`,
      name,
      state: {
        name,
        ...args.inputs,
        result: args.type.includes('Random')
          ? '5c1c5657-085b-41c8-8d11-de897e70eae7'
          : name.endsWith('ssh')
          ? {
              publicKey: '1234567890',
              privateKey: '1234567890',
            }
          : '',
      },
    };
  },
  call: (args: pulumi.runtime.MockCallArgs) => args.inputs,
});
