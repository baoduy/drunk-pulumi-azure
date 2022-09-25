import * as global from '../../Common/GlobalEnv';
import { expect } from 'chai';

describe('GlobalEnv tests', () => {
  it('Global Resource Group', () => {
    expect(global.groupInfo.resourceGroupName).to.be.equal('global-grp-hbd');
    expect(global.logGroupInfo.resourceGroupName).to.be.equal(
      'global-logs-grp-hbd'
    );
  });
});
