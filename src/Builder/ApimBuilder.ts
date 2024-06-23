import { ApimBuilderResults, Builder, BuilderProps } from "./types";

class ApimBuilder extends Builder<ApimBuilderResults> {
  public constructor(props: BuilderProps) {
    super(props);
  }
  public build(): ApimBuilderResults {
    throw new Error("Method not implemented.");
  }
}

export default (props: BuilderProps) => new ApimBuilder(props);
