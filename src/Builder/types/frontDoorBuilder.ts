import { ResourceInfo } from '../../types';
import { IBuilder } from './genericBuilder';

export type FrontDoorBuilderEndpointType = {};

/**
 * Interface for building a Front Door resource.
 */
export interface IFrontDoorBuilder extends IBuilder<ResourceInfo> {}
