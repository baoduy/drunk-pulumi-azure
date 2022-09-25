import * as location from '../../Common/Location';
import { expect } from 'chai';

describe('Location tests', () => {
  it('Get all locations', async () => {
    const locations = await location.getAllLocations();
    expect(locations).to.have.length.above(10);
  });
});
