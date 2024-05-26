import {
  CommonBuilderProps,
  IResourcesBuilder,
  ResourcesBuilder,
} from "../types";

export type AksBuilderProps = CommonBuilderProps & {};
export type AskBuilderResults = {};

interface IAksBuilder extends IResourcesBuilder<AskBuilderResults> {}

export class AksBuilder
  extends ResourcesBuilder<AskBuilderResults>
  implements IAksBuilder
{
  constructor({ ...others }: AksBuilderProps) {
    super(others);
  }

  public build(): AskBuilderResults {
    throw new Error("Method not implemented.");
  }
}
